import { Request, Response, NextFunction } from 'express';
import { ValidationService } from '../../application/services/validation.service';

export class ValidationController {
  private validationService: ValidationService;

  constructor() {
    this.validationService = new ValidationService();
  }

  async scan(req: Request, res: Response, next: NextFunction) {
    try {
      const validatorId = (req as any).user?.id;
      const result = await this.validationService.scanQR(req.body.qrCode, req.body.eventId, validatorId);
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async validateCode(req: Request, res: Response, next: NextFunction) {
    try {
      const validatorId = (req as any).user?.id;
      const result = await this.validationService.validateByCode(
        req.body.ticketCode,
        req.body.eventId,
        validatorId
      );
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const result = await this.validationService.getHistory(req.params.eventId, userId, req.query);
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

