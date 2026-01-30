import { Router, Request, Response, NextFunction } from 'express';
import { put } from '@vercel/blob';
import path from 'path';
import multer from 'multer';
import { config } from '../../infrastructure/config';
import { uploadSingle } from '../../infrastructure/middleware/upload.middleware';
import { authMiddleware, requireRole } from '../../infrastructure/middleware/auth.middleware';
import { AppError } from '../../infrastructure/middleware/error.middleware';

const router = Router();

router.use(authMiddleware);
router.use(requireRole('ORGANIZER', 'ADMIN'));

// Multer con manejo de errores (tamaño, tipo de archivo)
function uploadSingleSafe(req: Request, res: Response, next: NextFunction): void {
  uploadSingle(req, res, (err: unknown) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(new AppError('La imagen no puede superar 5 MB', 400, 'FILE_TOO_LARGE'));
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return next(new AppError('Envía el archivo con el campo "image"', 400, 'INVALID_FIELD'));
        }
      }
      return next(err instanceof Error ? err : new AppError('Error al subir el archivo', 400, 'UPLOAD_ERROR'));
    }
    next();
  });
}

router.post('/image', uploadSingleSafe, async (req, res, next) => {
  try {
    if (!req.file) {
      throw new AppError('No se subió ningún archivo', 400, 'NO_FILE_UPLOADED');
    }

    const file = req.file as Express.Multer.File & { buffer?: Buffer };
    const isVercel = Boolean(process.env.VERCEL);

    // Vercel: archivo en memoria → subir a Vercel Blob
    if (isVercel) {
      const buffer = file.buffer ?? (file as unknown as { buffer?: Buffer }).buffer;
      if (!buffer) {
        throw new AppError(
          'Subida en Vercel requiere Blob Storage. Crea un Blob en el proyecto Vercel y configura BLOB_READ_WRITE_TOKEN.',
          503,
          'BLOB_NOT_CONFIGURED'
        );
      }
      if (!config.blob.token) {
        throw new AppError(
          'Variable BLOB_READ_WRITE_TOKEN no configurada. Añade Blob Storage en Vercel (Storage → Create → Blob).',
          503,
          'BLOB_NOT_CONFIGURED'
        );
      }
      const ext = path.extname(file.originalname) || '.png';
      const pathname = `events/event-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
      const blob = await put(pathname, buffer, {
        contentType: file.mimetype || 'image/png',
        access: 'public',
        token: config.blob.token,
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
    const filename = file.filename ?? (file as unknown as { filename?: string }).filename;
    if (!filename) {
      throw new AppError('Configuración de upload incorrecta (sin filename)', 500, 'UPLOAD_CONFIG');
    }
    res.json({
      success: true,
      data: {
        url: `/uploads/${filename}`,
        filename,
        size: file.size,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Subida directa como en la guía de Vercel Blob: body = archivo (stream).
 * Evita multipart y límites de multer. Máx 4.5 MB (límite de Vercel).
 */
router.post('/image-raw', async (req, res, next) => {
  try {
    if (!config.blob.token) {
      throw new AppError(
        'Variable BLOB_READ_WRITE_TOKEN no configurada. Añade Blob Storage en Vercel (store: ' + config.blob.storeId + ').',
        503,
        'BLOB_NOT_CONFIGURED'
      );
    }
    const filename = (req.query.filename as string) || `event-${Date.now()}.png`;
    const pathname = `events/${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(filename) || '.png'}`;
    const contentType = req.get('Content-Type') || 'image/png';

    const blob = await put(pathname, req, {
      access: 'public',
      contentType,
      token: config.blob.token,
    });

    res.json({
      success: true,
      data: {
        url: blob.url,
        filename: path.basename(blob.pathname),
      },
    });
  } catch (error) {
    next(error);
  }
});

export { router as uploadRoutes };
