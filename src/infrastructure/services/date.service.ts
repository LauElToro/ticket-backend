/**
 * Servicio para cálculos de fechas, especialmente días hábiles
 */

export class DateService {
  /**
   * Calcula la fecha de vencimiento sumando días hábiles (excluyendo sábados y domingos)
   * @param startDate Fecha de inicio
   * @param businessDays Número de días hábiles a sumar
   * @returns Fecha de vencimiento
   */
  static addBusinessDays(startDate: Date, businessDays: number): Date {
    const result = new Date(startDate);
    let daysAdded = 0;
    let currentDay = 0;

    while (daysAdded < businessDays) {
      result.setDate(result.getDate() + 1);
      currentDay = result.getDay();

      // Si no es sábado (6) ni domingo (0), cuenta como día hábil
      if (currentDay !== 0 && currentDay !== 6) {
        daysAdded++;
      }
    }

    return result;
  }

  /**
   * Verifica si una fecha está vencida
   */
  static isExpired(expiresAt: Date): boolean {
    return new Date() > expiresAt;
  }

  /**
   * Calcula días hábiles restantes hasta una fecha
   */
  static getRemainingBusinessDays(expiresAt: Date): number {
    const today = new Date();
    let days = 0;
    const current = new Date(today);

    while (current < expiresAt) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        days++;
      }
      current.setDate(current.getDate() + 1);
    }

    return days;
  }

  /**
   * Formatea una fecha para mostrar
   */
  static formatDate(date: Date, locale: string = 'es-AR'): string {
    return date.toLocaleDateString(locale, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  /**
   * Formatea fecha y hora
   */
  static formatDateTime(date: Date, locale: string = 'es-AR'): string {
    return date.toLocaleString(locale, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}

