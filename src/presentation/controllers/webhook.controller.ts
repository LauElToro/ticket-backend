import { Request, Response, NextFunction } from 'express';
import { PaymentService } from '../../application/services/payment.service';
import { logger } from '../../infrastructure/logger';

export class WebhookController {
  private paymentService: PaymentService;

  constructor() {
    this.paymentService = new PaymentService();
  }

  async handleMercadoPagoWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      const { type, data } = req.body;
      const xSignature = req.headers['x-signature'] as string;
      const xRequestId = req.headers['x-request-id'] as string;

      logger.info('Webhook recibido de MercadoPago', {
        type,
        dataId: data?.id,
        xSignature: xSignature?.substring(0, 50),
        xRequestId,
      });

      // Validar firma del webhook (opcional pero recomendado)
      // En producción, deberías validar la firma usando el webhook secret

      // Procesar el webhook
      const result = await this.paymentService.processWebhook({
        type,
        data,
      });

      // MercadoPago espera un 200 para confirmar que recibimos el webhook
      res.status(200).json({
        success: true,
        processed: result.processed,
      });
    } catch (error: any) {
      logger.error('Error al procesar webhook de MercadoPago', {
        error: error.message,
        stack: error.stack,
      });

      // Aún así retornamos 200 para que MercadoPago no reintente inmediatamente
      // En producción, podrías querer retornar 500 para que reintente
      res.status(200).json({
        success: false,
        error: error.message,
      });
    }
  }
}

