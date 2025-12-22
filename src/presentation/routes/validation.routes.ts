import { Router } from 'express';
import { ValidationController } from '../controllers/validation.controller';
import { authMiddleware, requireRole } from '../../infrastructure/middleware/auth.middleware';

const router = Router();
const validationController = new ValidationController();

router.use(authMiddleware); // Todas las rutas requieren autenticación

router.post('/scan', requireRole('VALIDATOR', 'ADMIN'), validationController.scan.bind(validationController));
router.post('/validate-code', requireRole('VALIDATOR', 'ADMIN'), validationController.validateCode.bind(validationController));
router.get('/event/:eventId/history', requireRole('VALIDATOR', 'ADMIN', 'ORGANIZER'), validationController.getHistory.bind(validationController));

export { router as validationRoutes };

