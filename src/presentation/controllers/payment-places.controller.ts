import { Request, Response, NextFunction } from 'express';
import { PaymentPlacesService } from '../../infrastructure/services/payment-places.service';
import { AppError } from '../../infrastructure/middleware/error.middleware';

export class PaymentPlacesController {
  async getNearbyPlaces(req: Request, res: Response, next: NextFunction) {
    try {
      const { city, address, latitude, longitude } = req.query;

      if (!city) {
        throw new AppError('Ciudad requerida', 400, 'CITY_REQUIRED');
      }

      const places = PaymentPlacesService.getNearbyPaymentPlaces(
        city as string,
        address as string | undefined,
        latitude ? parseFloat(latitude as string) : undefined,
        longitude ? parseFloat(longitude as string) : undefined
      );

      res.json({
        success: true,
        data: places,
      });
    } catch (error) {
      next(error);
    }
  }

  async getBankAccountInfo(req: Request, res: Response, next: NextFunction) {
    try {
      const bankInfo = PaymentPlacesService.getBankAccountInfo();
      res.json({
        success: true,
        data: bankInfo,
      });
    } catch (error) {
      next(error);
    }
  }
}

