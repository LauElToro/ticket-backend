import { Router } from 'express';
import { VendedorController } from '../controllers/vendedor.controller';
import { authMiddleware, requireRole } from '../../infrastructure/middleware/auth.middleware';

const router = Router();
const vendedorController = new VendedorController();

// Rutas para vendedores (requieren autenticación y rol VENDEDOR)
router.get('/dashboard', authMiddleware, requireRole('VENDEDOR'), vendedorController.getDashboard.bind(vendedorController));
router.get('/metrics', authMiddleware, requireRole('VENDEDOR'), vendedorController.getMetrics.bind(vendedorController));
router.post('/referidos', authMiddleware, requireRole('VENDEDOR'), vendedorController.createReferido.bind(vendedorController));
router.put('/referidos/code', authMiddleware, requireRole('VENDEDOR'), vendedorController.updateReferidoCode.bind(vendedorController));
router.put('/referidos/all-codes', authMiddleware, requireRole('VENDEDOR'), vendedorController.updateAllReferidoCodes.bind(vendedorController));

// Rutas para organizadores/admins (crear y gestionar vendedores)
router.post('/', authMiddleware, requireRole('ORGANIZER', 'ADMIN'), vendedorController.createVendedor.bind(vendedorController));
router.post('/assign-event', authMiddleware, requireRole('ORGANIZER', 'ADMIN'), vendedorController.assignEvent.bind(vendedorController));
router.get('/', authMiddleware, requireRole('ORGANIZER', 'ADMIN'), vendedorController.getAllVendedores.bind(vendedorController));

export { router as vendedorRoutes };

