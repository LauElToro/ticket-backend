import { TicketRepository } from '../../infrastructure/repositories/TicketRepository';
import { AppError } from '../../infrastructure/middleware/error.middleware';
import { QRService } from '../../infrastructure/services/qr.service';
import { DateService } from '../../infrastructure/services/date.service';

export class TicketService {
  private ticketRepository: TicketRepository;

  constructor() {
    this.ticketRepository = new TicketRepository();
  }

  async getMyTickets(userId: string, query: any) {
    return this.ticketRepository.findByOwner(userId, query);
  }

  async getById(id: string, userId: string) {
    const ticket = await this.ticketRepository.findById(id);
    if (!ticket) {
      throw new AppError('Entrada no encontrada', 404, 'TICKET_NOT_FOUND');
    }
    
    if (ticket.ownerId !== userId) {
      throw new AppError('No autorizado', 403, 'FORBIDDEN');
    }

    return ticket;
  }

  async getQRImage(id: string, userId: string) {
    const ticket = await this.getById(id, userId);
    
    // Verificar que el ticket esté activo y no vencido
    if (ticket.status !== 'ACTIVE') {
      throw new AppError('La entrada no está activa', 400, 'TICKET_NOT_ACTIVE');
    }

    if (DateService.isExpired(ticket.expiresAt)) {
      throw new AppError('La entrada ha expirado', 400, 'TICKET_EXPIRED');
    }

    // Generar imagen QR
    const qrImage = await QRService.generateQRImage(ticket.qrCode, { size: 300 });
    return Buffer.from(qrImage.split(',')[1], 'base64');
  }

  async generatePDF(id: string, userId: string) {
    const ticket = await this.getById(id, userId);
    
    // Por ahora retornamos un JSON con los datos del ticket
    // TODO: Implementar generación real de PDF con librería como pdfkit o puppeteer
    const ticketData = {
      id: ticket.id,
      qrCode: ticket.qrCode,
      event: ticket.event,
      ticketType: ticket.ticketType,
      purchaseDate: ticket.purchaseDate,
      expiresAt: ticket.expiresAt,
    };
    
    return JSON.stringify(ticketData);
  }

  async resendEmail(id: string, userId: string) {
    const ticket = await this.getById(id, userId);
    // TODO: Implementar reenvío de email con nodemailer
    return { message: 'Email reenviado exitosamente' };
  }

  /**
   * Obtiene la factura de una entrada
   */
  async getInvoice(id: string, userId: string) {
    const ticket = await this.getById(id, userId);
    
    return {
      ticket: {
        id: ticket.id,
        qrCode: ticket.qrCode,
        purchaseDate: ticket.purchaseDate,
        expiresAt: ticket.expiresAt,
        status: ticket.status,
      },
      event: ticket.event,
      ticketType: ticket.ticketType,
      order: ticket.order,
      owner: ticket.owner,
    };
  }

  /**
   * Crea tickets para una orden completada
   */
  async createTicketsForOrder(orderId: string, ticketsData: Array<{ ticketTypeId: string; quantity: number }>) {
    return this.ticketRepository.createTicketsForOrder(orderId, ticketsData);
  }
}

