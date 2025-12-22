/**
 * Servicio para obtener lugares de pago cercanos (Rapipago, Pago Fácil)
 * Basado en la ubicación del evento
 */

export interface PaymentPlace {
  name: string;
  type: 'RAPIPAGO' | 'PAGO_FACIL' | 'BANCO';
  address: string;
  city: string;
  distance?: string;
  latitude?: number;
  longitude?: number;
  openingHours?: string;
}

export class PaymentPlacesService {
  /**
   * Obtiene lugares de pago cercanos basado en la ubicación del evento
   * Por ahora retorna lugares simulados, pero podría integrarse con APIs de geolocalización
   */
  static getNearbyPaymentPlaces(
    eventCity: string,
    eventAddress?: string,
    eventLatitude?: number,
    eventLongitude?: number
  ): PaymentPlace[] {
    // Lugares simulados basados en la ciudad
    // En producción, esto podría usar Google Places API o similar
    const places: PaymentPlace[] = [];

    // Si tenemos coordenadas, podríamos calcular distancias reales
    // Por ahora, retornamos lugares comunes en Argentina
    const commonPlaces = this.getCommonPlacesForCity(eventCity);

    return commonPlaces;
  }

  /**
   * Retorna lugares comunes de pago por ciudad
   */
  private static getCommonPlacesForCity(city: string): PaymentPlace[] {
    const cityLower = city.toLowerCase();
    
    // Lugares comunes en Buenos Aires
    if (cityLower.includes('buenos aires') || cityLower.includes('caba') || cityLower.includes('capital')) {
      return [
        {
          name: 'Rapipago - Av. Corrientes 1234',
          type: 'RAPIPAGO',
          address: 'Av. Corrientes 1234',
          city: 'Buenos Aires',
          distance: '0.5 km',
          openingHours: 'Lun a Vie: 9:00 - 20:00, Sáb: 9:00 - 18:00',
        },
        {
          name: 'Pago Fácil - Av. Santa Fe 2345',
          type: 'PAGO_FACIL',
          address: 'Av. Santa Fe 2345',
          city: 'Buenos Aires',
          distance: '1.2 km',
          openingHours: 'Lun a Dom: 8:00 - 22:00',
        },
        {
          name: 'Rapipago - Av. Cabildo 3456',
          type: 'RAPIPAGO',
          address: 'Av. Cabildo 3456',
          city: 'Buenos Aires',
          distance: '2.1 km',
          openingHours: 'Lun a Vie: 9:00 - 20:00, Sáb: 9:00 - 18:00',
        },
        {
          name: 'Pago Fácil - Av. Rivadavia 4567',
          type: 'PAGO_FACIL',
          address: 'Av. Rivadavia 4567',
          city: 'Buenos Aires',
          distance: '1.8 km',
          openingHours: 'Lun a Dom: 8:00 - 22:00',
        },
        {
          name: 'Banco Nación - Av. 9 de Julio 5678',
          type: 'BANCO',
          address: 'Av. 9 de Julio 5678',
          city: 'Buenos Aires',
          distance: '0.8 km',
          openingHours: 'Lun a Vie: 10:00 - 15:00',
        },
      ];
    }

    // Lugares comunes en Córdoba
    if (cityLower.includes('córdoba') || cityLower.includes('cordoba')) {
      return [
        {
          name: 'Rapipago - Av. Colón 1234',
          type: 'RAPIPAGO',
          address: 'Av. Colón 1234',
          city: 'Córdoba',
          distance: '0.6 km',
          openingHours: 'Lun a Vie: 9:00 - 20:00, Sáb: 9:00 - 18:00',
        },
        {
          name: 'Pago Fácil - Av. Vélez Sarsfield 2345',
          type: 'PAGO_FACIL',
          address: 'Av. Vélez Sarsfield 2345',
          city: 'Córdoba',
          distance: '1.1 km',
          openingHours: 'Lun a Dom: 8:00 - 22:00',
        },
        {
          name: 'Rapipago - Av. Duarte Quirós 3456',
          type: 'RAPIPAGO',
          address: 'Av. Duarte Quirós 3456',
          city: 'Córdoba',
          distance: '1.5 km',
          openingHours: 'Lun a Vie: 9:00 - 20:00, Sáb: 9:00 - 18:00',
        },
      ];
    }

    // Lugares comunes en Rosario
    if (cityLower.includes('rosario')) {
      return [
        {
          name: 'Rapipago - Av. Córdoba 1234',
          type: 'RAPIPAGO',
          address: 'Av. Córdoba 1234',
          city: 'Rosario',
          distance: '0.7 km',
          openingHours: 'Lun a Vie: 9:00 - 20:00, Sáb: 9:00 - 18:00',
        },
        {
          name: 'Pago Fácil - Av. San Martín 2345',
          type: 'PAGO_FACIL',
          address: 'Av. San Martín 2345',
          city: 'Rosario',
          distance: '1.0 km',
          openingHours: 'Lun a Dom: 8:00 - 22:00',
        },
      ];
    }

    // Lugares genéricos para otras ciudades
    return [
      {
        name: 'Rapipago - Centro',
        type: 'RAPIPAGO',
        address: 'Av. Principal 123',
        city: city,
        distance: '0.5 km',
        openingHours: 'Lun a Vie: 9:00 - 20:00, Sáb: 9:00 - 18:00',
      },
      {
        name: 'Pago Fácil - Centro',
        type: 'PAGO_FACIL',
        address: 'Av. Principal 456',
        city: city,
        distance: '0.8 km',
        openingHours: 'Lun a Dom: 8:00 - 22:00',
      },
    ];
  }

  /**
   * Obtiene información de cuenta bancaria para pagos
   */
  static getBankAccountInfo() {
    return {
      bankName: 'Banco de la Nación Argentina',
      accountType: 'Cuenta Corriente',
      accountNumber: '1234567890123456',
      cbu: '0110123412341234567890',
      alias: 'TICKETYA.PAGOS',
      cuit: '20-12345678-9',
      accountHolder: 'Ticket-Ya S.A.',
    };
  }
}

