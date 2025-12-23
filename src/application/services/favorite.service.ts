import { FavoriteRepository } from '../../infrastructure/repositories/FavoriteRepository';
import { AppError } from '../../infrastructure/middleware/error.middleware';

export class FavoriteService {
  private favoriteRepository: FavoriteRepository;

  constructor() {
    this.favoriteRepository = new FavoriteRepository();
  }

  async addFavorite(userId: string, eventId: string) {
    return await this.favoriteRepository.addFavorite(userId, eventId);
  }

  async removeFavorite(userId: string, eventId: string) {
    return await this.favoriteRepository.removeFavorite(userId, eventId);
  }

  async getFavorites(userId: string) {
    return await this.favoriteRepository.getFavorites(userId);
  }

  async isFavorite(userId: string, eventId: string): Promise<boolean> {
    return await this.favoriteRepository.isFavorite(userId, eventId);
  }
}

