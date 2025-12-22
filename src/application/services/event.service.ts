import { EventRepository } from '../../infrastructure/repositories/EventRepository';
import { AppError } from '../../infrastructure/middleware/error.middleware';

export class EventService {
  private eventRepository: EventRepository;

  constructor() {
    this.eventRepository = new EventRepository();
  }

  async list(query: any) {
    return this.eventRepository.findMany(query);
  }

  async getById(id: string) {
    const event = await this.eventRepository.findById(id);
    if (!event) {
      throw new AppError('Evento no encontrado', 404, 'EVENT_NOT_FOUND');
    }
    return event;
  }

  async create(data: any, organizerId: string) {
    return this.eventRepository.create(data, organizerId);
  }

  async update(id: string, data: any, userId: string) {
    const event = await this.eventRepository.findById(id);
    if (!event) {
      throw new AppError('Evento no encontrado', 404, 'EVENT_NOT_FOUND');
    }
    
    // Verificar permisos
    if (event.organizerId !== userId) {
      throw new AppError('No autorizado', 403, 'FORBIDDEN');
    }

    return this.eventRepository.update(id, data);
  }

  async delete(id: string, userId: string) {
    const event = await this.eventRepository.findById(id);
    if (!event) {
      throw new AppError('Evento no encontrado', 404, 'EVENT_NOT_FOUND');
    }
    
    if (event.organizerId !== userId) {
      throw new AppError('No autorizado', 403, 'FORBIDDEN');
    }

    await this.eventRepository.delete(id);
  }
}

