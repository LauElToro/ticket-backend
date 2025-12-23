import { Router } from 'express';
import { PaymentController } from '../controllers/payment.controller';
import { authMiddleware } from '../../infrastructure/middleware/auth.middleware';

const router = Router();
const paymentController = new PaymentController();

router.post('/mercadopago/create-preference', authMiddleware, paymentController.createMercadoPagoPreference.bind(paymentController));

export { router as paymentRoutes };

