import { Router } from 'express';
import { uploadSingle } from '../../infrastructure/middleware/upload.middleware';
import { authMiddleware, requireRole } from '../../infrastructure/middleware/auth.middleware';
import { AppError } from '../../infrastructure/middleware/error.middleware';

const router = Router();

router.use(authMiddleware);
router.use(requireRole('ORGANIZER', 'ADMIN'));

router.post('/image', uploadSingle, (req, res, next) => {
  try {
    if (!req.file) {
      throw new AppError('No se subió ningún archivo', 400, 'NO_FILE_UPLOADED');
    }

    const imageUrl = `/uploads/${req.file.filename}`;
    
    res.json({
      success: true,
      data: {
        url: imageUrl,
        filename: req.file.filename,
        size: req.file.size,
      },
    });
  } catch (error) {
    next(error);
  }
});

export { router as uploadRoutes };

