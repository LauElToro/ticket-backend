import { MercadoPagoService } from '../../infrastructure/services/mercadopago.service';
import { OrderRepository } from '../../infrastructure/repositories/OrderRepository';
import { AppError } from '../../infrastructure/middleware/error.middleware';
import { config } from '../../infrastructure/config';
import { logger } from '../../infrastructure/logger';

export class PaymentService {
  private mercadoPagoService: MercadoPagoService;
  private orderRepository: OrderRepository;

  constructor() {
    this.mercadoPagoService = new MercadoPagoService();
    this.orderRepository = new OrderRepository();
  }

  /**
   * Crea una preferencia de pago en MercadoPago
   */
  async createMercadoPagoPreference(data: {
    orderId: string;
    items: Array<{
      title: string;
      quantity: number;
      unit_price: number;
    }>;
    payerEmail?: string;
    payerName?: string;
    payerDni?: string;
  }) {
    try {
      // Obtener la orden
      const order = await this.orderRepository.findById(data.orderId);
      if (!order) {
        throw new AppError('Orden no encontrada', 404, 'ORDER_NOT_FOUND');
      }

      // Construir URLs de retorno
      const baseUrl = config.frontendUrl;
      const notificationUrl = `${process.env.BACKEND_URL || 'http://localhost:3000'}/api/webhooks/mercadopago`;

      const successUrl = `${baseUrl}/confirmacion?status=success&order_id=${data.orderId}`;
      const failureUrl = `${baseUrl}/confirmacion?status=failure&order_id=${data.orderId}`;
      const pendingUrl = `${baseUrl}/confirmacion?status=pending&order_id=${data.orderId}`;

      // Crear preferencia en MercadoPago
      const preference = await this.mercadoPagoService.createPreference({
        items: data.items,
        payer: {
          email: data.payerEmail,
          name: data.payerName,
          identification: data.payerDni ? { type: 'DNI', number: data.payerDni } : undefined,
        },
        back_urls: {
          success: successUrl,
          failure: failureUrl,
          pending: pendingUrl,
        },
        notification_url: notificationUrl,
        external_reference: data.orderId,
        statement_descriptor: 'Ticket-Ya',
      });

      // Actualizar la orden con el paymentId
      await this.orderRepository.updatePaymentId(data.orderId, preference.id);

      logger.info('Preferencia de MercadoPago creada', {
        orderId: data.orderId,
        preferenceId: preference.id,
      });

      return preference;
    } catch (error: any) {
      logger.error('Error al crear preferencia de MercadoPago', {
        error: error.message,
        orderId: data.orderId,
      });
      throw error;
    }
  }

  /**
   * Procesa un webhook de MercadoPago
   */
  async processWebhook(data: {
    type: string;
    data: {
      id: string;
    };
  }) {
    try {
      if (data.type !== 'payment') {
        logger.info('Webhook ignorado (tipo no es payment)', { type: data.type });
        return { processed: false };
      }

      const paymentId = data.data.id;
      logger.info('Procesando webhook de MercadoPago', { paymentId });

      // Obtener información del pago desde MercadoPago
      const payment = await this.mercadoPagoService.getPayment(paymentId);

      // Buscar la orden por external_reference
      const orderId = payment.external_reference;
      if (!orderId) {
        logger.warn('Pago sin external_reference', { paymentId });
        return { processed: false };
      }

      const order = await this.orderRepository.findById(orderId);
      if (!order) {
        logger.warn('Orden no encontrada para el pago', { paymentId, orderId });
        return { processed: false };
      }

      // Verificar si el pago ya fue procesado
      if (order.paymentStatus === 'COMPLETED' && order.paymentId === paymentId) {
        logger.info('Pago ya procesado', { paymentId, orderId });
        return { processed: true, alreadyProcessed: true };
      }

      // Procesar según el estado del pago
      if (payment.status === 'approved') {
        // Confirmar el pago y generar tickets
        await this.orderRepository.confirmPayment(orderId, {
          paymentId,
          paymentMethod: 'MERCADOPAGO',
          status: 'approved',
        }, order.userId);

        logger.info('Pago aprobado y procesado', { paymentId, orderId });
        return { processed: true, status: 'approved' };
      } else if (payment.status === 'pending') {
        await this.orderRepository.updatePaymentStatus(orderId, 'PROCESSING');
        logger.info('Pago pendiente', { paymentId, orderId });
        return { processed: true, status: 'pending' };
      } else if (payment.status === 'rejected' || payment.status === 'cancelled') {
        await this.orderRepository.updatePaymentStatus(orderId, 'FAILED');
        logger.info('Pago rechazado o cancelado', { paymentId, orderId });
        return { processed: true, status: 'rejected' };
      }

      return { processed: false };
    } catch (error: any) {
      logger.error('Error al procesar webhook de MercadoPago', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }
}

