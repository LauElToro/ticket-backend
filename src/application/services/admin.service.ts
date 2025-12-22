import { AdminRepository } from '../../infrastructure/repositories/AdminRepository';
import { AppError } from '../../infrastructure/middleware/error.middleware';

export class AdminService {
  private adminRepository: AdminRepository;

  constructor() {
    this.adminRepository = new AdminRepository();
  }

  async getDashboard(userId: string) {
    return this.adminRepository.getDashboard(userId);
  }

  async getEventById(id: string, userId?: string) {
    const event = await this.adminRepository.getEventById(id, userId);
    if (!event) {
      throw new AppError('Evento no encontrado', 404, 'EVENT_NOT_FOUND');
    }
    return event;
  }

  async getEvents(query: any, userId?: string) {
    return this.adminRepository.getEvents(query, userId);
  }

  async createEvent(data: any, userId: string) {
    return this.adminRepository.createEvent(data, userId);
  }

  async updateEvent(id: string, data: any, userId: string) {
    return this.adminRepository.updateEvent(id, data, userId);
  }

  async deleteEvent(id: string, userId: string) {
    return this.adminRepository.deleteEvent(id, userId);
  }

  async getUsers(query: any) {
    return this.adminRepository.getUsers(query);
  }

  async getUserById(id: string) {
    return this.adminRepository.getUserById(id);
  }

  async updateUser(id: string, data: any) {
    return this.adminRepository.updateUser(id, data);
  }

  async blockUser(id: string) {
    return this.adminRepository.blockUser(id);
  }

  async getEventStats(eventId: string) {
    return this.adminRepository.getEventStats(eventId);
  }
}

