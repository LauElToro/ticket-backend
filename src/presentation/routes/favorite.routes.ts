import { Router } from 'express';
import { FavoriteController } from '../controllers/favorite.controller';
import { authMiddleware } from '../../infrastructure/middleware/auth.middleware';

const router = Router();
const favoriteController = new FavoriteController();

router.post('/:eventId', authMiddleware, favoriteController.addFavorite.bind(favoriteController));
router.delete('/:eventId', authMiddleware, favoriteController.removeFavorite.bind(favoriteController));
router.get('/', authMiddleware, favoriteController.getFavorites.bind(favoriteController));
router.get('/:eventId/check', authMiddleware, favoriteController.checkFavorite.bind(favoriteController));

export { router as favoriteRoutes };


