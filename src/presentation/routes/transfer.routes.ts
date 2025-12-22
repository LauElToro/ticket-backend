import { Router } from 'express';
import { TransferController } from '../controllers/transfer.controller';
import { authMiddleware } from '../../infrastructure/middleware/auth.middleware';

const router = Router();
const transferController = new TransferController();

router.use(authMiddleware); // Todas las rutas requieren autenticación

// Transferir entrada
router.post('/', transferController.transfer.bind(transferController));
router.post('/by-qr', transferController.transferByQR.bind(transferController));

// Historial de transferencias
router.get('/history', transferController.getHistory.bind(transferController));

export { router as transferRoutes };
