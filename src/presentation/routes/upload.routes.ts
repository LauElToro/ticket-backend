import { Router } from 'express';
import { put } from '@vercel/blob';
import path from 'path';
import { uploadSingle } from '../../infrastructure/middleware/upload.middleware';
import { authMiddleware, requireRole } from '../../infrastructure/middleware/auth.middleware';
import { AppError } from '../../infrastructure/middleware/error.middleware';

const router = Router();

router.use(authMiddleware);
router.use(requireRole('ORGANIZER', 'ADMIN'));

router.post('/image', uploadSingle, async (req, res, next) => {
  try {
    if (!req.file) {
      throw new AppError('No se subió ningún archivo', 400, 'NO_FILE_UPLOADED');
    }

    const file = req.file as Express.Multer.File & { buffer?: Buffer };

    // Vercel: archivo en memoria → subir a Vercel Blob
    if (file.buffer && process.env.VERCEL) {
      if (!process.env.BLOB_READ_WRITE_TOKEN) {
        throw new AppError(
          'Subida de imágenes no configurada en Vercel. Añade Blob Storage en el proyecto y la variable BLOB_READ_WRITE_TOKEN.',
          503,
          'BLOB_NOT_CONFIGURED'
        );
      }
      const ext = path.extname(file.originalname) || '.png';
      const pathname = `events/event-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
      const blob = await put(pathname, file.buffer, {
        contentType: file.mimetype || 'image/png',
        access: 'public',
      });
      return res.json({
        success: true,
        data: {
          url: blob.url,
          filename: path.basename(blob.pathname),
          size: file.size,
        },
      });
    }

    // Local: archivo en disco → URL relativa
    const imageUrl = `/uploads/${file.filename}`;
    res.json({
      success: true,
      data: {
        url: imageUrl,
        filename: file.filename,
        size: file.size,
      },
    });
  } catch (error) {
    next(error);
  }
});

export { router as uploadRoutes };
