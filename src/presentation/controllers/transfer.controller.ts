import { Request, Response, NextFunction } from 'express';
import { TransferService } from '../../application/services/transfer.service';

export class TransferController {
  private transferService: TransferService;

  constructor() {
    this.transferService = new TransferService();
  }

  /**
   * Transfiere una entrada (por email o QR personal)
   */
  async transfer(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const result = await this.transferService.transfer(req.body, userId);
      res.json({
        success: true,
        data: result,
        message: 'Entrada transferida exitosamente',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Transfiere una entrada escaneando el QR personal del receptor
   */
  async transferByQR(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const { ticketId, personalQRCode } = req.body;
      
      if (!ticketId || !personalQRCode) {
        return res.status(400).json({
          success: false,
          error: { message: 'ticketId y personalQRCode son requeridos' },
        });
      }

      const result = await this.transferService.transferByPersonalQR(ticketId, personalQRCode, userId);
      res.json({
        success: true,
        data: result,
        message: 'Entrada transferida exitosamente',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtiene el historial de transferencias
   */
  async getHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      const result = await this.transferService.getTransferHistory(userId);
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
