import { Request, Response, NextFunction } from 'express';
import { logger } from '../logger';
import { ZodError } from 'zod';

export function errorHandler(
  err: Error & { statusCode?: number; code?: string; details?: any },
  req: Request,
  res: Response,
  next: NextFunction
) {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Error interno del servidor';
  let code = err.code || 'INTERNAL_ERROR';
  let details = err.details;

  // Validación Zod (body inválido)
  if (err.name === 'ZodError' && err instanceof ZodError) {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Datos inválidos';
    details = err.flatten().fieldErrors;
  }

  logger.error('Error:', {
    message,
    statusCode,
    code,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      ...(details && { details }),
      ...(process.env.NODE_ENV === 'development' && err.stack && { stack: err.stack }),
    },
  });
}

export class AppError extends Error {
  statusCode: number;
  code: string;
  details?: any;

  constructor(message: string, statusCode: number = 500, code?: string, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.code = code || 'INTERNAL_ERROR';
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

