import { Request, Response, NextFunction } from 'express';
import { VendedorService } from '../../application/services/vendedor.service';

export class VendedorController {
  private vendedorService: VendedorService;

  constructor() {
    this.vendedorService = new VendedorService();
  }

  async createVendedor(req: Request, res: Response, next: NextFunction) {
    try {
      const assignedBy = (req as any).user?.id;
      const result = await this.vendedorService.createVendedor(req.body, assignedBy);
      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      // Buscar el vendedor por userId
      const { prisma } = await import('../../infrastructure/database/prisma');
      const vendedor = await prisma.vendedor.findUnique({
        where: { userId },
      });

      if (!vendedor) {
        return res.status(404).json({
          success: false,
          error: { message: 'Vendedor no encontrado' },
        });
      }

      const result = await this.vendedorService.getVendedorDashboard(vendedor.id);
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async assignEvent(req: Request, res: Response, next: NextFunction) {
    try {
      const assignedBy = (req as any).user?.id;
      const { vendedorId, eventId, ticketLimit } = req.body;
      const result = await this.vendedorService.assignEvent(vendedorId, eventId, ticketLimit, assignedBy);
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async createReferido(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const { prisma } = await import('../../infrastructure/database/prisma');
      const vendedor = await prisma.vendedor.findUnique({
        where: { userId },
      });

      if (!vendedor) {
        return res.status(404).json({
          success: false,
          error: { message: 'Vendedor no encontrado' },
        });
      }

      const { eventId, customCode } = req.body;
      const result = await this.vendedorService.createReferido(vendedor.id, eventId, customCode);
      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateReferidoCode(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const { prisma } = await import('../../infrastructure/database/prisma');
      const vendedor = await prisma.vendedor.findUnique({
        where: { userId },
      });

      if (!vendedor) {
        return res.status(404).json({
          success: false,
          error: { message: 'Vendedor no encontrado' },
        });
      }

      const { referidoId, customCode } = req.body;
      const result = await this.vendedorService.updateReferidoCode(referidoId, customCode, vendedor.id);
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateAllReferidoCodes(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const { prisma } = await import('../../infrastructure/database/prisma');
      const vendedor = await prisma.vendedor.findUnique({
        where: { userId },
      });

      if (!vendedor) {
        return res.status(404).json({
          success: false,
          error: { message: 'Vendedor no encontrado' },
        });
      }

      const { customCode } = req.body;
      const result = await this.vendedorService.updateAllReferidoCodes(vendedor.id, customCode);
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getMetrics(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const { prisma } = await import('../../infrastructure/database/prisma');
      const vendedor = await prisma.vendedor.findUnique({
        where: { userId },
      });

      if (!vendedor) {
        return res.status(404).json({
          success: false,
          error: { message: 'Vendedor no encontrado' },
        });
      }

      const result = await this.vendedorService.getVendedorMetrics(vendedor.id);
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getAllVendedores(req: Request, res: Response, next: NextFunction) {
    try {
      const assignedBy = (req as any).user?.id;
      const result = await this.vendedorService.getAllVendedores(assignedBy);
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async syncReferidos(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const { prisma } = await import('../../infrastructure/database/prisma');
      const vendedor = await prisma.vendedor.findUnique({
        where: { userId },
      });

      if (!vendedor) {
        return res.status(404).json({
          success: false,
          error: { message: 'Vendedor no encontrado' },
        });
      }

      const result = await this.vendedorService.syncReferidos(vendedor.id);
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}


