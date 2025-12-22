import { Router } from 'express';
import { TicketController } from '../controllers/ticket.controller';
import { authMiddleware } from '../../infrastructure/middleware/auth.middleware';

const router = Router();
const ticketController = new TicketController();

router.use(authMiddleware); // Todas las rutas requieren autenticación

router.get('/my-tickets', ticketController.getMyTickets.bind(ticketController));
router.get('/:id', ticketController.getById.bind(ticketController));
router.get('/:id/qr', ticketController.getQR.bind(ticketController));
router.get('/:id/invoice', ticketController.getInvoice.bind(ticketController));
router.get('/:id/download', ticketController.download.bind(ticketController));
router.post('/:id/resend-email', ticketController.resendEmail.bind(ticketController));

export { router as ticketRoutes };

