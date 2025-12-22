import { Router } from 'express';
import { EventController } from '../controllers/event.controller';
import { authMiddleware, requireRole } from '../../infrastructure/middleware/auth.middleware';

const router = Router();
const eventController = new EventController();

router.get('/', eventController.list.bind(eventController));
router.get('/:id', eventController.getById.bind(eventController));
router.post('/', authMiddleware, requireRole('ORGANIZER', 'ADMIN'), eventController.create.bind(eventController));
router.put('/:id', authMiddleware, requireRole('ORGANIZER', 'ADMIN'), eventController.update.bind(eventController));
router.delete('/:id', authMiddleware, requireRole('ORGANIZER', 'ADMIN'), eventController.delete.bind(eventController));

export { router as eventRoutes };

