import { Router } from 'express';
import { TrackingController } from '../controllers/tracking.controller';
import { authMiddleware, requireRole } from '../../infrastructure/middleware/auth.middleware';

const router = Router();
const trackingController = new TrackingController();

router.use(authMiddleware); // Todas las rutas requieren autenticación
router.use(requireRole('ADMIN', 'ORGANIZER')); // Requiere rol de admin u organizador

// Métricas de Meta Pixel
router.get('/meta-pixel/:id', trackingController.getMetaPixelMetrics.bind(trackingController));

// Métricas de Google Ads
router.get('/google-ads/:id', trackingController.getGoogleAdsMetrics.bind(trackingController));

// Todas las métricas
router.get('/all', trackingController.getAllMetrics.bind(trackingController));

export { router as trackingRoutes };



