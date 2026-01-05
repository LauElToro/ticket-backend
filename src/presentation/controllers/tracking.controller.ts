import { Request, Response, NextFunction } from 'express';
import { TrackingService } from '../../application/services/tracking.service';

export class TrackingController {
  async getMetaPixelMetrics(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: eventId } = req.params;
      const { startDate, endDate, accessToken } = req.query;

      if (!startDate || !endDate || !accessToken) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'startDate, endDate y accessToken son requeridos',
            code: 'MISSING_PARAMS',
          },
        });
      }

      const result = await TrackingService.getMetaPixelMetrics({
        eventId,
        startDate: startDate as string,
        endDate: endDate as string,
        accessToken: accessToken as string,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      next(error);
    }
  }

  async getGoogleAdsMetrics(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: eventId } = req.params;
      const { startDate, endDate, customerId, refreshToken, clientId, clientSecret } = req.query;

      if (!startDate || !endDate || !customerId || !refreshToken || !clientId || !clientSecret) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'startDate, endDate, customerId, refreshToken, clientId y clientSecret son requeridos',
            code: 'MISSING_PARAMS',
          },
        });
      }

      const result = await TrackingService.getGoogleAdsMetrics({
        eventId,
        startDate: startDate as string,
        endDate: endDate as string,
        customerId: customerId as string,
        refreshToken: refreshToken as string,
        clientId: clientId as string,
        clientSecret: clientSecret as string,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      next(error);
    }
  }

  async getAllMetrics(req: Request, res: Response, next: NextFunction) {
    try {
      const { startDate, endDate } = req.query;

      const result = await TrackingService.getAllMetrics(
        startDate as string | undefined,
        endDate as string | undefined
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      next(error);
    }
  }
}



