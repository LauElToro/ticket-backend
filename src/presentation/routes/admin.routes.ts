import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { authMiddleware, requireRole } from '../../infrastructure/middleware/auth.middleware';

const router = Router();
const adminController = new AdminController();

router.use(authMiddleware); // Todas las rutas requieren autenticación
router.use(requireRole('ADMIN', 'ORGANIZER')); // Requiere rol de admin u organizador

// Dashboard
router.get('/dashboard', adminController.getDashboard.bind(adminController));

// Eventos
router.get('/events', adminController.getEvents.bind(adminController));
router.get('/events/:id', adminController.getEventById.bind(adminController));
router.post('/events', adminController.createEvent.bind(adminController));
router.put('/events/:id', adminController.updateEvent.bind(adminController));
router.delete('/events/:id', adminController.deleteEvent.bind(adminController));

// Usuarios
router.get('/users', adminController.getUsers.bind(adminController));
router.get('/users/:id', adminController.getUserById.bind(adminController));
router.put('/users/:id', adminController.updateUser.bind(adminController));
router.post('/users/:id/block', adminController.blockUser.bind(adminController));

// Estadísticas
router.get('/stats/events/:id', adminController.getEventStats.bind(adminController));

export { router as adminRoutes };

