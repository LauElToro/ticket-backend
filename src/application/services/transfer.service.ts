import { TransferRepository } from '../../infrastructure/repositories/TransferRepository';
import { AppError } from '../../infrastructure/middleware/error.middleware';
import { QRService } from '../../infrastructure/services/qr.service';

export class TransferService {
  private transferRepository: TransferRepository;

  constructor() {
    this.transferRepository = new TransferRepository();
  }

  /**
   * Transfiere una entrada inmediatamente
   */
  async transfer(data: any, userId: string) {
    try {
      return await this.transferRepository.transfer(data, userId);
    } catch (error: any) {
      throw new AppError(error.message || 'Error al transferir entrada', 400, 'TRANSFER_ERROR');
    }
  }

  /**
   * Transfiere por QR personal del usuario receptor
   */
  async transferByPersonalQR(ticketId: string, personalQRCode: string, userId: string) {
    // Validar el QR personal
    const validation = QRService.validatePersonalQRCode(personalQRCode);
    
    if (!validation.valid || !validation.userId) {
      throw new AppError('QR personal inválido', 400, 'INVALID_QR');
    }

    // Transferir al usuario del QR
    return await this.transfer({
      ticketId,
      toUserId: validation.userId,
      method: 'QR',
    }, userId);
  }

  /**
   * Obtiene el historial de transferencias
   */
  async getTransferHistory(userId: string) {
    return this.transferRepository.getTransferHistory(userId);
  }
}
