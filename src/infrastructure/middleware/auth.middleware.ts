import { Request, Response, NextFunction } from 'express';
import { JwtService } from '../services/jwt.service';
import { AppError } from './error.middleware';

const jwtService = new JwtService();

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Token de autenticación requerido', 401, 'AUTH_TOKEN_REQUIRED');
    }

    const token = authHeader.substring(7);
    const payload = jwtService.verifyAccessToken(token);
    
    req.user = {
      id: payload.userId,
      email: payload.email,
      role: payload.role,
    };

    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
    } else {
      next(new AppError('Token inválido', 401, 'INVALID_TOKEN'));
    }
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('No autenticado', 401, 'NOT_AUTHENTICATED'));
    }

    if (!roles.includes(req.user.role)) {
      return next(new AppError('No autorizado', 403, 'FORBIDDEN'));
    }

    next();
  };
}

