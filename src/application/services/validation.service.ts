import { ValidationRepository } from '../../infrastructure/repositories/ValidationRepository';
import { AppError } from '../../infrastructure/middleware/error.middleware';

export class ValidationService {
  private validationRepository: ValidationRepository;

  constructor() {
    this.validationRepository = new ValidationRepository();
  }

  async scanQR(qrCode: string, eventId: string, validatorId: string) {
    return this.validationRepository.scanQR(qrCode, eventId, validatorId);
  }

  async validateByCode(ticketCode: string, eventId: string, validatorId: string) {
    return this.validationRepository.validateByCode(ticketCode, eventId, validatorId);
  }

  async getHistory(eventId: string, userId: string, query: any) {
    return this.validationRepository.getHistory(eventId, userId, query);
  }
}

