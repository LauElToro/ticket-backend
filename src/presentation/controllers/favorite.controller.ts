import { Request, Response, NextFunction } from 'express';
import { FavoriteService } from '../../application/services/favorite.service';

export class FavoriteController {
  private favoriteService: FavoriteService;

  constructor() {
    this.favoriteService = new FavoriteService();
  }

  async addFavorite(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const { eventId } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { message: 'No autenticado' },
        });
      }

      const result = await this.favoriteService.addFavorite(userId, eventId);
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async removeFavorite(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const { eventId } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { message: 'No autenticado' },
        });
      }

      await this.favoriteService.removeFavorite(userId, eventId);
      res.json({
        success: true,
        message: 'Evento eliminado de favoritos',
      });
    } catch (error) {
      next(error);
    }
  }

  async getFavorites(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { message: 'No autenticado' },
        });
      }

      const favorites = await this.favoriteService.getFavorites(userId);
      res.json({
        success: true,
        data: favorites.map((fav) => fav.event),
      });
    } catch (error) {
      next(error);
    }
  }

  async checkFavorite(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const { eventId } = req.params;

      if (!userId) {
        return res.json({
          success: true,
          data: { isFavorite: false },
        });
      }

      const isFavorite = await this.favoriteService.isFavorite(userId, eventId);
      res.json({
        success: true,
        data: { isFavorite },
      });
    } catch (error) {
      next(error);
    }
  }
}


