import { Request, Response, NextFunction } from 'express';
import { PorteroService } from '../../application/services/portero.service';

export class PorteroController {
  private porteroService: PorteroService;

  constructor() {
    this.porteroService = new PorteroService();
  }

  async createPortero(req: Request, res: Response, next: NextFunction) {
    try {
      const assignedBy = (req as any).user?.id;
      const result = await this.porteroService.createPortero(req.body, assignedBy);
      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async scanTicket(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const { prisma } = await import('../../infrastructure/database/prisma');
      const portero = await prisma.portero.findUnique({
        where: { userId },
      });

      if (!portero) {
        return res.status(404).json({
          success: false,
          error: { message: 'Portero no encontrado' },
        });
      }

      const { qrCode } = req.body;
      const result = await this.porteroService.scanTicket(qrCode, portero.id);
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getScanHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const { prisma } = await import('../../infrastructure/database/prisma');
      const portero = await prisma.portero.findUnique({
        where: { userId },
      });

      if (!portero) {
        return res.status(404).json({
          success: false,
          error: { message: 'Portero no encontrado' },
        });
      }

      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const result = await this.porteroService.getScanHistory(portero.id, limit);
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getAllPorteros(req: Request, res: Response, next: NextFunction) {
    try {
      const assignedBy = (req as any).user?.id;
      const result = await this.porteroService.getAllPorteros(assignedBy);
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

