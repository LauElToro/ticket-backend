import multer from 'multer';
import path from 'path';
import fs from 'fs';
import type { Request } from 'express';

const isVercel = Boolean(process.env.VERCEL);

// En Vercel el filesystem es de solo lectura; usamos memoria y luego Vercel Blob
const uploadsDir = path.join(process.cwd(), 'public', 'uploads');

const diskStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `event-${uniqueSuffix}${ext}`);
  },
});

const memoryStorage = multer.memoryStorage();

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = /jpeg|jpg|png|webp|gif/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  }
  cb(new Error('Solo se permiten imágenes (JPEG, JPG, PNG, WEBP, GIF)'));
};

export const upload = multer({
  storage: isVercel ? memoryStorage : diskStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter,
});

export const uploadSingle = upload.single('image');
