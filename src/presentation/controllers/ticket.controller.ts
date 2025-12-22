import { Request, Response, NextFunction } from 'express';
import { TicketService } from '../../application/services/ticket.service';

export class TicketController {
  private ticketService: TicketService;

  constructor() {
    this.ticketService = new TicketService();
  }

  async getMyTickets(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const result = await this.ticketService.getMyTickets(userId, req.query);
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const result = await this.ticketService.getById(req.params.id, userId);
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getQR(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const qrImage = await this.ticketService.getQRImage(req.params.id, userId);
      res.type('image/png');
      res.send(qrImage);
    } catch (error) {
      next(error);
    }
  }

  async download(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const pdf = await this.ticketService.generatePDF(req.params.id, userId);
      res.type('application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="ticket-${req.params.id}.pdf"`);
      res.send(pdf);
    } catch (error) {
      next(error);
    }
  }

  async resendEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      await this.ticketService.resendEmail(req.params.id, userId);
      res.json({
        success: true,
        message: 'Email reenviado exitosamente',
      });
    } catch (error) {
      next(error);
    }
  }

  async getInvoice(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const invoice = await this.ticketService.getInvoice(req.params.id, userId);
      res.json({
        success: true,
        data: invoice,
      });
    } catch (error) {
      next(error);
    }
  }
}

