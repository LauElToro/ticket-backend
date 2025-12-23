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

  async getById(id: string, privateLink?: string) {
    // Si se proporciona un privateLink, intentar buscar por link primero
    let event = null;
    if (privateLink) {
      event = await this.eventRepository.findByPrivateLink(privateLink);
      // Si se encontró por link, verificar que el id coincida
      if (event && event.id !== id) {
        throw new AppError('Link de acceso inválido', 403, 'INVALID_LINK');
      }
    }
    
    // Si no se encontró por link, buscar por id
    if (!event) {
      event = await this.eventRepository.findById(id);
    }
    
    if (!event) {
      throw new AppError('Evento no encontrado', 404, 'EVENT_NOT_FOUND');
    }
    
    // Si el evento es privado y no se proporcionó el link correcto, retornar error
    if (!event.isPublic && event.privateLink !== privateLink) {
      throw new AppError('Este evento es privado. Se requiere un link de acceso válido.', 403, 'PRIVATE_EVENT');
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

