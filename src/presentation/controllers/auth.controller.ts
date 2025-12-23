import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../../application/services/auth.service';
import { AppError } from '../../infrastructure/middleware/error.middleware';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.authService.register(req.body);
      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.authService.login(req.body.email, req.body.password);
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const refreshToken = req.body.refreshToken || req.headers['x-refresh-token'];
      if (!refreshToken) {
        throw new AppError('Refresh token requerido', 400, 'REFRESH_TOKEN_REQUIRED');
      }
      const result = await this.authService.refreshToken(refreshToken);
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async verifyEmail(req: Request, res: Response, next: NextFunction) {
    try {
      await this.authService.verifyEmail(req.body.token);
      res.json({
        success: true,
        message: 'Email verificado exitosamente',
      });
    } catch (error) {
      next(error);
    }
  }

  async getPersonalQR(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const result = await this.authService.getPersonalQR(userId);
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getPersonalQRImage(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const qrData = await this.authService.getPersonalQR(userId);
      if (!qrData?.qrCode) {
        return res.status(404).json({
          success: false,
          error: { message: 'QR personal no encontrado' },
        });
      }
      
      const QRService = (await import('../../infrastructure/services/qr.service')).QRService;
      const qrImage = await QRService.generateQRImage(qrData.qrCode, { size: 300 });
      const base64Data = qrImage.split(',')[1];
      const buffer = Buffer.from(base64Data, 'base64');
      
      res.type('image/png');
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  }

  async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const result = await this.authService.getMe(userId);
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

