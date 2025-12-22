import { Router } from 'express';
import { PaymentPlacesController } from '../controllers/payment-places.controller';

const router = Router();
const paymentPlacesController = new PaymentPlacesController();

// Estas rutas son públicas (no requieren autenticación)
router.get('/nearby', paymentPlacesController.getNearbyPlaces.bind(paymentPlacesController));
router.get('/bank-account', paymentPlacesController.getBankAccountInfo.bind(paymentPlacesController));

export { router as paymentPlacesRoutes };

