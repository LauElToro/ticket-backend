import { TicketRepository } from '../repositories/TicketRepository';
import { logger } from '../logger';

/**
 * Job para verificar y expirar tickets vencidos
 * Debe ejecutarse diariamente
 */
export class TicketExpirationJob {
  private ticketRepository: TicketRepository;

  constructor() {
    this.ticketRepository = new TicketRepository();
  }

  async run() {
    try {
      logger.info('Ejecutando job de verificación de tickets vencidos...');
      const expiredCount = await this.ticketRepository.checkAndExpireTickets();
      logger.info(`Job completado. ${expiredCount} tickets expirados y liberados`);
      return expiredCount;
    } catch (error: any) {
      logger.error('Error en job de expiración de tickets:', error);
      throw error;
    }
  }
}

// Ejecutar cada día a las 2 AM
export function startTicketExpirationJob() {
  const job = new TicketExpirationJob();
  
  // Ejecutar inmediatamente al iniciar
  job.run().catch((error) => {
    logger.error('Error en ejecución inicial del job:', error);
  });

  // Ejecutar cada 24 horas
  const interval = 24 * 60 * 60 * 1000; // 24 horas en milisegundos
  setInterval(() => {
    job.run().catch((error) => {
      logger.error('Error en ejecución periódica del job:', error);
    });
  }, interval);

  logger.info('Job de expiración de tickets iniciado');
}

