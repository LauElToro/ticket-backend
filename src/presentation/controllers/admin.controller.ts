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

  async createTicketType(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const result = await this.adminService.createTicketType(req.params.id, req.body, userId);
      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateTicketType(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const { id: eventId, ticketTypeId } = req.params;
      const result = await this.adminService.updateTicketType(eventId, ticketTypeId, req.body, userId);
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getEventPromotores(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const result = await this.adminService.getEventPromotores(req.params.id, userId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async addPromotorToEvent(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const result = await this.adminService.addPromotorToEvent(req.params.id, req.body, userId);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getEventPorteros(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const result = await this.adminService.getEventPorteros(req.params.id, userId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async addPorteroToEvent(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const result = await this.adminService.addPorteroToEvent(req.params.id, req.body, userId);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async removePorteroFromEvent(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      await this.adminService.removePorteroFromEvent(req.params.id, req.params.porteroId, userId);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }

  async getPorteroResumen(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const result = await this.adminService.getPorteroResumenForEvent(req.params.id, req.params.porteroId, userId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getEventAccreditationSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const result = await this.adminService.getEventAccreditationSummary(req.params.id, userId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async setPromotorActive(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const { vendedorId } = req.params;
      const isActive = req.body?.isActive === true;
      const result = await this.adminService.setPromotorActive(vendedorId, isActive, userId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async activateAllPromotores(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const result = await this.adminService.activateAllPromotores(req.params.id, userId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async deactivateAllPromotores(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const result = await this.adminService.deactivateAllPromotores(req.params.id, userId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async exportEventPromotoresExcel(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const buffer = await this.adminService.exportEventPromotoresExcel(req.params.id, userId);
      const fileName = `promotores-evento-${req.params.id}-${new Date().toISOString().split('T')[0]}.xlsx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  }

  async importEventPromotores(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const items = Array.isArray(req.body) ? req.body : req.body?.items ? req.body.items : [];
      const result = await this.adminService.importEventPromotores(req.params.id, items, userId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async cloneEvent(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const result = await this.adminService.cloneEvent(req.params.id, userId);
      res.status(201).json({
        success: true,
        data: result,
        message: 'Evento clonado correctamente',
      });
    } catch (error) {
      next(error);
    }
  }

  async getEventValidations(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const result = await this.adminService.getEventValidations(req.params.id, userId);
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getPromoCodes(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const result = await this.adminService.getPromoCodes(req.params.id, userId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async createPromoCode(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const result = await this.adminService.createPromoCode(req.params.id, req.body, userId);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async updatePromoCode(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const result = await this.adminService.updatePromoCode(req.params.promoId, req.body, userId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async deletePromoCode(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      await this.adminService.deletePromoCode(req.params.promoId, userId);
      res.json({ success: true, message: 'Código eliminado' });
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

  async getEventSalesDetails(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const eventId = req.params.id;
      const filters = {
        rrpp: req.query.rrpp as string | undefined,
        tipo: req.query.tipo as string | undefined,
        estado: req.query.estado as string | undefined,
        email: req.query.email as string | undefined,
      };
      const result = await this.adminService.getEventSalesDetails(eventId, userId, filters);
      res.json({ success: true, data: result });
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

  async getCortesiaBases(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const result = await this.adminService.getCortesiaBases(req.params.id, userId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async createCortesiaBase(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const result = await this.adminService.createCortesiaBase(req.params.id, userId, req.body);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getCortesiaBase(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const result = await this.adminService.getCortesiaBase(req.params.baseId, userId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async deleteCortesiaBase(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      await this.adminService.deleteCortesiaBase(req.params.baseId, userId);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }

  async downloadCortesiaBase(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const base = await this.adminService.getCortesiaBase(req.params.baseId, userId);
      const rows = (base.rows as { name: string; email: string }[]) || [];
      const csv = ['nombre,email', ...rows.map((r) => `"${String(r.name).replace(/"/g, '""')}","${String(r.email).replace(/"/g, '""')}"`)].join('\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(base.name)}.csv"`);
      res.send('\uFEFF' + csv);
    } catch (error) {
      next(error);
    }
  }

  async sendCortesiasFromBase(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const result = await this.adminService.sendCortesiasFromBase(req.params.id, userId, req.body);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}

