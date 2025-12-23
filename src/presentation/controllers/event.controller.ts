import { Request, Response, NextFunction } from 'express';
import { EventService } from '../../application/services/event.service';

export class EventController {
  private eventService: EventService;

  constructor() {
    this.eventService = new EventService();
  }

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.eventService.list(req.query);
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
      const { id } = req.params;
      const { link } = req.query; // Para eventos privados: ?link=privateLink
      
      const result = await this.eventService.getById(id, link as string);
      
      // Si el evento es privado y no se proporcionó el link correcto, retornar error
      if (result && !result.isPublic && result.privateLink !== link) {
        return res.status(403).json({
          success: false,
          message: 'Este evento es privado. Se requiere un link de acceso válido.',
        });
      }
      
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const result = await this.eventService.create(req.body, userId);
      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const result = await this.eventService.update(req.params.id, req.body, userId);
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      await this.eventService.delete(req.params.id, userId);
      res.json({
        success: true,
        message: 'Evento eliminado exitosamente',
      });
    } catch (error) {
      next(error);
    }
  }
}

