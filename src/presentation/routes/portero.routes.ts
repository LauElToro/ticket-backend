import { Router } from 'express';
import { PorteroController } from '../controllers/portero.controller';
import { authMiddleware, requireRole } from '../../infrastructure/middleware/auth.middleware';

const router = Router();
const porteroController = new PorteroController();

// Rutas para porteros (requieren autenticación y rol PORTERO)
router.post('/scan', authMiddleware, requireRole('PORTERO'), porteroController.scanTicket.bind(porteroController));
router.get('/history', authMiddleware, requireRole('PORTERO'), porteroController.getScanHistory.bind(porteroController));

// Rutas para organizadores/admins (crear y gestionar porteros)
router.post('/', authMiddleware, requireRole('ORGANIZER', 'ADMIN'), porteroController.createPortero.bind(porteroController));
router.get('/', authMiddleware, requireRole('ORGANIZER', 'ADMIN'), porteroController.getAllPorteros.bind(porteroController));

export { router as porteroRoutes };


