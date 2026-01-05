import { Request, Response, NextFunction } from 'express';
import { AdminService } from '../../application/services/admin.service';

export class AdminController {
  private adminService: AdminService;

  constructor() {
    this.adminService = new AdminService();
  }

  async getDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const result = await this.adminService.getDashboard(userId);
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getEventById(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const result = await this.adminService.getEventById(req.params.id, userId);
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getEvents(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const result = await this.adminService.getEvents(req.query, userId);
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async createEvent(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const result = await this.adminService.createEvent(req.body, userId);
      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateEvent(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const result = await this.adminService.updateEvent(req.params.id, req.body, userId);
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteEvent(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      await this.adminService.deleteEvent(req.params.id, userId);
      res.json({
        success: true,
        message: 'Evento eliminado',
      });
    } catch (error) {
      next(error);
    }
  }

  async getUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.adminService.getUsers(req.query);
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getUserById(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.adminService.getUserById(req.params.id);
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateUser(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.adminService.updateUser(req.params.id, req.body);
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteUser(req: Request, res: Response, next: NextFunction) {
    try {
      const assignedBy = (req as any).user?.id;
      await this.adminService.deleteUser(req.params.id, assignedBy);
      res.json({
        success: true,
        message: 'Usuario eliminado exitosamente',
      });
    } catch (error) {
      next(error);
    }
  }

  async exportUsersToExcel(req: Request, res: Response, next: NextFunction) {
    try {
      const userRole = (req as any).user?.role;
      
      // Solo ADMIN puede exportar
      if (userRole !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Solo los administradores pueden exportar usuarios',
        });
      }

      const excelBuffer = await this.adminService.exportUsersToExcel();
      
      const fileName = `usuarios-${new Date().toISOString().split('T')[0]}.xlsx`;
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.send(excelBuffer);
    } catch (error) {
      next(error);
    }
  }

  async blockUser(req: Request, res: Response, next: NextFunction) {
    try {
      await this.adminService.blockUser(req.params.id);
      res.json({
        success: true,
        message: 'Usuario bloqueado',
      });
    } catch (error) {
      next(error);
    }
  }

  async getEventStats(req: Request, res: Response, next: NextFunction) {
    try {
      const eventId = req.params.id;
      if (!eventId) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'ID de evento no proporcionado',
            code: 'MISSING_EVENT_ID',
          },
        });
      }
      const result = await this.adminService.getEventStats(eventId);
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async createVendedor(req: Request, res: Response, next: NextFunction) {
    try {
      const assignedBy = (req as any).user?.id;
      const result = await this.adminService.createVendedor(req.body, assignedBy);
      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async createPortero(req: Request, res: Response, next: NextFunction) {
    try {
      const assignedBy = (req as any).user?.id;
      const result = await this.adminService.createPortero(req.body, assignedBy);
      res.status(201).json({
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
      const result = await this.adminService.getAllVendedores(assignedBy);
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
      const result = await this.adminService.getAllPorteros(assignedBy);
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getTrackingConfig(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const result = await this.adminService.getTrackingConfig(userId);
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateTrackingConfig(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const result = await this.adminService.updateTrackingConfig(userId, req.body);
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getAccountingConfig(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const result = await this.adminService.getAccountingConfig(userId);
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateAccountingConfig(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const result = await this.adminService.updateAccountingConfig(userId, req.body);
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async giftTicketsByEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const result = await this.adminService.giftTicketsByEmail(req.body, userId);
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

