import { Router } from 'express';
import { WebhookController } from '../controllers/webhook.controller';

const router = Router();
const webhookController = new WebhookController();

// Webhook de MercadoPago (no requiere autenticación, pero debería validar la firma)
router.post('/mercadopago', webhookController.handleMercadoPagoWebhook.bind(webhookController));

export { router as webhookRoutes };

