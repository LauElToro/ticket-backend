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
// Exportar usuarios - Solo ADMIN
router.get('/users/export', requireRole('ADMIN'), adminController.exportUsersToExcel.bind(adminController));

// Crear vendedores y porteros (debe ir ANTES de /users/:id para evitar conflictos)
router.post('/users/vendedor', adminController.createVendedor.bind(adminController));
router.post('/users/portero', adminController.createPortero.bind(adminController));
router.get('/vendedores', adminController.getAllVendedores.bind(adminController));
router.get('/porteros', adminController.getAllPorteros.bind(adminController));

// Rutas de usuarios con ID (debe ir DESPUÉS de las rutas específicas)
router.get('/users/:id', adminController.getUserById.bind(adminController));
router.put('/users/:id', adminController.updateUser.bind(adminController));
router.delete('/users/:id', adminController.deleteUser.bind(adminController));
router.post('/users/:id/block', adminController.blockUser.bind(adminController));

// Estadísticas
router.get('/stats/events/:id', adminController.getEventStats.bind(adminController));

// Configuración de Tracking
router.get('/tracking-config', adminController.getTrackingConfig.bind(adminController));
router.put('/tracking-config', adminController.updateTrackingConfig.bind(adminController));

// Configuración Contable
router.get('/accounting-config', adminController.getAccountingConfig.bind(adminController));
router.put('/accounting-config', adminController.updateAccountingConfig.bind(adminController));

export { router as adminRoutes };

