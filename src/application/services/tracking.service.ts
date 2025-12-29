import { PrismaClient, Decimal } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

export interface MetaPixelMetricsParams {
  eventId: string;
  startDate: string;
  endDate: string;
  accessToken: string;
}

export interface GoogleAdsMetricsParams {
  eventId: string;
  startDate: string;
  endDate: string;
  customerId: string;
  refreshToken: string;
  clientId: string;
  clientSecret: string;
}

export class TrackingService {
  /**
   * Obtiene métricas de Meta Pixel para un evento
   */
  static async getMetaPixelMetrics(params: MetaPixelMetricsParams) {
    const { eventId, startDate, endDate, accessToken } = params;

    // Obtener el evento para verificar que existe y obtener el pixel ID
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { metaPixelId: true, title: true },
    });

    if (!event) {
      throw new Error('Evento no encontrado');
    }

    if (!event.metaPixelId) {
      throw new Error('El evento no tiene configurado un Meta Pixel ID');
    }

    try {
      // Llamar a la API de Facebook Graph para obtener métricas
      // Nota: Esta es una implementación simplificada. En producción, necesitarías
      // manejar mejor los tokens y usar la API correcta de Facebook
      const response = await axios.get(
        `https://graph.facebook.com/v18.0/${event.metaPixelId}/events`,
        {
          params: {
            access_token: accessToken,
            start_time: Math.floor(new Date(startDate).getTime() / 1000),
            end_time: Math.floor(new Date(endDate).getTime() / 1000),
          },
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      // Procesar los eventos y calcular métricas
      const events = response.data?.data || [];
      const metrics = {
        PageView: 0,
        ViewContent: 0,
        InitiateCheckout: 0,
        Purchase: 0,
      };
      let revenue = 0;

      events.forEach((event: any) => {
        const eventName = event.event_name;
        if (metrics.hasOwnProperty(eventName)) {
          metrics[eventName as keyof typeof metrics]++;
        }

        // Calcular revenue de eventos Purchase
        if (eventName === 'Purchase' && event.custom_data?.value) {
          revenue += parseFloat(event.custom_data.value) || 0;
        }
      });

      // Guardar métricas en la base de datos
      const date = new Date();
      await this.saveMetrics(eventId, 'META_PIXEL', metrics, revenue, date);

      return {
        events: metrics,
        revenue,
        totalEvents: events.length,
      };
    } catch (error: any) {
      console.error('Error obteniendo métricas de Meta Pixel:', error);
      
      // Si hay un error, intentar obtener métricas guardadas previamente
      const savedMetrics = await prisma.trackingMetrics.findMany({
        where: {
          eventId,
          platform: 'META_PIXEL',
          date: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        },
      });

      if (savedMetrics.length > 0) {
        const metrics = {
          PageView: 0,
          ViewContent: 0,
          InitiateCheckout: 0,
          Purchase: 0,
        };
        let revenue = 0;

        savedMetrics.forEach((metric) => {
          if (metrics.hasOwnProperty(metric.metricType)) {
            metrics[metric.metricType as keyof typeof metrics] += metric.count;
          }
          if (metric.revenue) {
            revenue += Number(metric.revenue);
          }
        });

        return {
          events: metrics,
          revenue,
          totalEvents: savedMetrics.length,
          cached: true,
        };
      }

      throw new Error(
        error.response?.data?.error?.message ||
        error.message ||
        'Error al obtener métricas de Meta Pixel'
      );
    }
  }

  /**
   * Obtiene métricas de Google Ads para un evento
   */
  static async getGoogleAdsMetrics(params: GoogleAdsMetricsParams) {
    const { eventId, startDate, endDate, customerId, refreshToken, clientId, clientSecret } = params;

    // Obtener el evento para verificar que existe y obtener el Google Ads ID
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { googleAdsId: true, title: true },
    });

    if (!event) {
      throw new Error('Evento no encontrado');
    }

    if (!event.googleAdsId) {
      throw new Error('El evento no tiene configurado un Google Ads ID');
    }

    try {
      // Obtener access token de Google usando refresh token
      const tokenResponse = await axios.post(
        'https://oauth2.googleapis.com/token',
        {
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }
      );

      const accessToken = tokenResponse.data.access_token;

      // Llamar a la API de Google Ads para obtener métricas
      // Nota: Esta es una implementación simplificada. En producción, necesitarías
      // usar el cliente oficial de Google Ads API
      const query = `
        SELECT
          metrics.conversions,
          metrics.conversions_value,
          metrics.clicks,
          metrics.impressions
        FROM campaign
        WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
        AND campaign.id = '${event.googleAdsId}'
      `;

      // Por ahora, retornamos datos simulados ya que la integración real requiere
      // configuración más compleja con Google Ads API
      // En producción, usarías: google.ads.googleads.v14.services.GoogleAdsServiceClient

      // Obtener métricas guardadas previamente o retornar estructura vacía
      const savedMetrics = await prisma.trackingMetrics.findMany({
        where: {
          eventId,
          platform: 'GOOGLE_ADS',
          date: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        },
      });

      let conversions = 0;
      let conversionValue = 0;
      let clicks = 0;
      let impressions = 0;

      savedMetrics.forEach((metric) => {
        if (metric.metricType === 'conversion') {
          conversions += metric.count;
          if (metric.revenue) {
            conversionValue += Number(metric.revenue);
          }
        } else if (metric.metricType === 'click') {
          clicks += metric.count;
        } else if (metric.metricType === 'impression') {
          impressions += metric.count;
        }
      });

      return {
        conversions,
        conversionValue,
        clicks,
        impressions,
        cached: savedMetrics.length > 0,
      };
    } catch (error: any) {
      console.error('Error obteniendo métricas de Google Ads:', error);
      throw new Error(
        error.response?.data?.error?.message ||
        error.message ||
        'Error al obtener métricas de Google Ads'
      );
    }
  }

  /**
   * Guarda métricas en la base de datos
   */
  private static async saveMetrics(
    eventId: string,
    platform: string,
    metrics: Record<string, number>,
    revenue: number,
    date: Date
  ) {
    const operations = Object.entries(metrics).map(([metricType, count]) => {
      const metricRevenue = metricType === 'Purchase' ? revenue : null;
      
      return prisma.trackingMetrics.upsert({
        where: {
          eventId_platform_metricType_date: {
            eventId,
            platform,
            metricType,
            date,
          },
        },
        update: {
          count,
          value: count,
          revenue: metricRevenue || null,
        },
        create: {
          eventId,
          platform,
          metricType,
          count,
          value: count,
          revenue: metricRevenue || null,
          date,
        },
      });
    });

    await prisma.$transaction(operations);
  }

  /**
   * Obtiene todas las métricas de tracking
   */
  static async getAllMetrics(startDate?: string, endDate?: string) {
    const where: any = {};
    
    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = new Date(startDate);
      }
      if (endDate) {
        where.date.lte = new Date(endDate);
      }
    }

    const metrics = await prisma.trackingMetrics.findMany({
      where,
      include: {
        event: {
          select: {
            id: true,
            title: true,
            metaPixelId: true,
            googleAdsId: true,
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
    });

    return metrics;
  }
}


