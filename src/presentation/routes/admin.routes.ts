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
router.post('/events/:id/clone', adminController.cloneEvent.bind(adminController));
router.post('/events/:id/ticket-types', adminController.createTicketType.bind(adminController));
router.put('/events/:id/ticket-types/:ticketTypeId', adminController.updateTicketType.bind(adminController));
router.get('/events/:id/promotores/export', adminController.exportEventPromotoresExcel.bind(adminController));
router.post('/events/:id/promotores/import', adminController.importEventPromotores.bind(adminController));
router.post('/events/:id/promotores/activate-all', adminController.activateAllPromotores.bind(adminController));
router.post('/events/:id/promotores/deactivate-all', adminController.deactivateAllPromotores.bind(adminController));
router.get('/events/:id/promotores', adminController.getEventPromotores.bind(adminController));
router.post('/events/:id/promotores', adminController.addPromotorToEvent.bind(adminController));
router.get('/events/:id/porteros', adminController.getEventPorteros.bind(adminController));
router.post('/events/:id/porteros', adminController.addPorteroToEvent.bind(adminController));
router.delete('/events/:id/porteros/:porteroId', adminController.removePorteroFromEvent.bind(adminController));
router.get('/events/:id/porteros/:porteroId/resumen', adminController.getPorteroResumen.bind(adminController));
router.get('/events/:id/accreditation-summary', adminController.getEventAccreditationSummary.bind(adminController));
router.patch('/events/:id/promotores/:vendedorId/active', adminController.setPromotorActive.bind(adminController));
router.get('/events/:id/validations', adminController.getEventValidations.bind(adminController));
router.get('/events/:id/cortesias-bases', adminController.getCortesiaBases.bind(adminController));
router.post('/events/:id/cortesias-bases', adminController.createCortesiaBase.bind(adminController));
router.post('/events/:id/cortesias-bases/send', adminController.sendCortesiasFromBase.bind(adminController));
router.get('/events/:id/cortesias-bases/:baseId', adminController.getCortesiaBase.bind(adminController));
router.get('/events/:id/cortesias-bases/:baseId/download', adminController.downloadCortesiaBase.bind(adminController));
router.delete('/events/:id/cortesias-bases/:baseId', adminController.deleteCortesiaBase.bind(adminController));
router.get('/events/:id/promoCodes', adminController.getPromoCodes.bind(adminController));
router.post('/events/:id/promoCodes', adminController.createPromoCode.bind(adminController));
router.put('/events/:id/promoCodes/:promoId', adminController.updatePromoCode.bind(adminController));
router.delete('/events/:id/promoCodes/:promoId', adminController.deletePromoCode.bind(adminController));

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
router.get('/events/:id/sales-details', adminController.getEventSalesDetails.bind(adminController));

// Configuración de Tracking
router.get('/tracking-config', adminController.getTrackingConfig.bind(adminController));
router.put('/tracking-config', adminController.updateTrackingConfig.bind(adminController));

// Configuración Contable
router.get('/accounting-config', adminController.getAccountingConfig.bind(adminController));
router.put('/accounting-config', adminController.updateAccountingConfig.bind(adminController));

// Regalar entradas por email
router.post('/tickets/gift', adminController.giftTicketsByEmail.bind(adminController));

export { router as adminRoutes };

