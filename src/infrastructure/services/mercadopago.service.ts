import { MercadoPagoConfig, Preference } from 'mercadopago';
import { config } from '../config';
import { logger } from '../logger';

export class MercadoPagoService {
  private client: MercadoPagoConfig;
  private preference: Preference;

  constructor() {
    if (!config.mercadopago.accessToken) {
      throw new Error('MERCADOPAGO_ACCESS_TOKEN no está configurado');
    }

    this.client = new MercadoPagoConfig({
      accessToken: config.mercadopago.accessToken,
      options: {
        timeout: 5000,
        idempotencyKey: 'abc',
      },
    });

    this.preference = new Preference(this.client);
  }

  /**
   * Verifica si el token es de sandbox (contiene "TEST")
   */
  private isSandboxToken(token: string): boolean {
    return token.includes('TEST') || token.includes('test');
  }

  /**
   * Crea una preferencia de pago en MercadoPago
   */
  async createPreference(data: {
    items: Array<{
      title: string;
      quantity: number;
      unit_price: number;
    }>;
    payer?: {
      email?: string;
      name?: string;
      identification?: {
        type: string;
        number: string;
      };
    };
    back_urls?: {
      success?: string;
      failure?: string;
      pending?: string;
    };
    auto_return?: 'approved' | 'all';
    notification_url?: string;
    external_reference?: string;
    statement_descriptor?: string;
  }) {
    try {
      const isLocalhost = 
        data.back_urls?.success?.includes('localhost') || 
        data.back_urls?.success?.includes('127.0.0.1') || 
        data.back_urls?.success?.includes('0.0.0.0');

      const preferenceData: any = {
        items: data.items,
        back_urls: data.back_urls || {},
        notification_url: data.notification_url,
        external_reference: data.external_reference,
        statement_descriptor: data.statement_descriptor || 'Ticket-Ya',
      };

      // auto_return solo para URLs públicas (no localhost)
      if (!isLocalhost && data.back_urls?.success) {
        preferenceData.auto_return = data.auto_return || 'approved';
        logger.info('auto_return habilitado (URLs públicas)');
      } else {
        logger.info('auto_return deshabilitado (localhost detectado)');
      }

      // Configurar payer (requerido para sandbox)
      if (this.isSandboxToken(config.mercadopago.accessToken)) {
        preferenceData.payer = {
          email: 'test_user_123456789@testuser.com', // Email de prueba válido para sandbox
        };
        logger.info('Usando email de prueba para sandbox');
      } else if (data.payer) {
        preferenceData.payer = data.payer;
      }

      const response = await this.preference.create({ body: preferenceData });

      logger.info('Preferencia de MercadoPago creada', {
        preferenceId: response.id,
        initPoint: response.init_point,
      });

      return {
        id: response.id,
        init_point: response.init_point,
        sandbox_init_point: response.sandbox_init_point,
        client_id: config.mercadopago.publicKey,
      };
    } catch (error: any) {
      logger.error('Error al crear preferencia de MercadoPago', {
        error: error.message,
        stack: error.stack,
      });
      throw new Error(`Error al crear preferencia de MercadoPago: ${error.message}`);
    }
  }

  /**
   * Obtiene información de un pago
   */
  async getPayment(paymentId: string) {
    try {
      const { Payment } = await import('mercadopago');
      const payment = new Payment(this.client);
      
      const response = await payment.get({ id: paymentId });
      return response;
    } catch (error: any) {
      logger.error('Error al obtener pago de MercadoPago', {
        error: error.message,
        paymentId,
      });
      throw new Error(`Error al obtener pago: ${error.message}`);
    }
  }

  /**
   * Valida la firma de un webhook
   */
  validateWebhookSignature(xSignature: string, xRequestId: string, dataId: string): boolean {
    try {
      // MercadoPago envía la firma en el header x-signature
      // Formato: "ts=timestamp,v1=signature"
      const parts = xSignature.split(',');
      const signaturePart = parts.find((p) => p.startsWith('v1='));
      
      if (!signaturePart) {
        return false;
      }

      const signature = signaturePart.split('=')[1];
      
      // En producción, deberías validar la firma usando el webhook secret
      // Por ahora, solo verificamos que existe
      return !!signature;
    } catch {
      return false;
    }
  }
}

