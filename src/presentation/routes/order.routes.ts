import { Router } from 'express';
import { OrderController } from '../controllers/order.controller';
import { authMiddleware } from '../../infrastructure/middleware/auth.middleware';

const router = Router();
const orderController = new OrderController();

router.use(authMiddleware); // Todas las rutas requieren autenticación

router.post('/', orderController.create.bind(orderController));
router.post('/:id/confirm', orderController.confirm.bind(orderController));
router.get('/:id', orderController.getById.bind(orderController));

export { router as orderRoutes };

