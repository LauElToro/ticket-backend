import { prisma } from '../database/prisma';
import { QRService } from '../services/qr.service';
import { DateService } from '../services/date.service';

export class TicketRepository {
  async findByOwner(userId: string, query: any) {
    const whereClause: any = {
      ownerId: userId,
    };

    // Si no se especifica upcoming, traer todos los tickets
    if (query.upcoming === 'true' || query.upcoming === true) {
      // Incluir tickets activos y pendientes de pago que no hayan expirado
      whereClause.OR = [
        {
          status: 'ACTIVE',
          expiresAt: { gt: new Date() },
        },
        {
          status: 'PENDING_PAYMENT',
        },
      ];
    } else if (query.upcoming === 'false' || query.upcoming === false) {
      // Tickets pasados: usados, expirados, o que ya pasaron su fecha de vencimiento
      whereClause.OR = [
        { status: 'USED' },
        { status: 'EXPIRED' },
        { expiresAt: { lte: new Date() } },
      ];
    }
    // Si no se especifica upcoming, traer todos los tickets del usuario

    const tickets = await prisma.ticket.findMany({
      where: whereClause,
      include: {
        event: {
          include: {
            organizer: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        ticketType: true,
        order: {
          select: {
            id: true,
            totalAmount: true,
            paymentMethod: true,
            paymentStatus: true,
            createdAt: true,
          },
        },
      },
      orderBy: query.upcoming === 'true' || query.upcoming === true
        ? { createdAt: 'desc' } // Ordenar por fecha de creación para ver los más recientes primero
        : { expiresAt: 'desc' },
    });

    return tickets;
  }

  async findById(id: string) {
    return prisma.ticket.findUnique({
      where: { id },
      include: {
        event: {
          include: {
            organizer: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        ticketType: true,
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            dni: true,
          },
        },
        order: {
          select: {
            id: true,
            totalAmount: true,
            paymentMethod: true,
            paymentStatus: true,
            createdAt: true,
            completedAt: true,
          },
        },
      },
    });
  }

  /**
   * Crea tickets para una orden completada
   */
  async createTicketsForOrder(
    orderId: string,
    ticketsData: Array<{ ticketTypeId: string; quantity: number }>,
    initialStatus: 'ACTIVE' | 'PENDING_PAYMENT' = 'ACTIVE'
  ) {
    // Obtener la orden con información del evento y usuario
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        event: true,
        user: true,
      },
    });

    if (!order) {
      throw new Error('Orden no encontrada');
    }

    const tickets = [];
    const purchaseDate = new Date();
    // Calcular vencimiento: 48 días hábiles desde la fecha de compra
    const expiresAt = DateService.addBusinessDays(purchaseDate, 48);

    for (const ticketData of ticketsData) {
      // Obtener información del tipo de entrada
      const ticketType = await prisma.ticketType.findUnique({
        where: { id: ticketData.ticketTypeId },
      });

      if (!ticketType) {
        throw new Error(`Tipo de entrada no encontrado: ${ticketData.ticketTypeId}`);
      }

      // Crear múltiples tickets según la cantidad
      for (let i = 0; i < ticketData.quantity; i++) {
        const qrCode = QRService.generateQRCode(orderId, order.eventId, order.userId);
        const qrHash = QRService.generateQRHash(orderId, order.eventId, order.userId);

        const ticket = await prisma.ticket.create({
          data: {
            ticketTypeId: ticketData.ticketTypeId,
            eventId: order.eventId,
            ownerId: order.userId,
            orderId: orderId,
            qrCode,
            qrHash,
            status: initialStatus,
            purchaseDate,
            expiresAt,
          },
          include: {
            event: true,
            ticketType: true,
          },
        });

        tickets.push(ticket);

        // Actualizar cantidad vendida del tipo de entrada
        await prisma.ticketType.update({
          where: { id: ticketData.ticketTypeId },
          data: {
            soldQty: { increment: 1 },
            availableQty: { decrement: 1 },
          },
        });
      }
    }

    return tickets;
  }

  /**
   * Verifica y actualiza tickets vencidos
   */
  async checkAndExpireTickets() {
    const expiredTickets = await prisma.ticket.findMany({
      where: {
        status: 'ACTIVE',
        expiresAt: { lte: new Date() },
      },
      include: {
        ticketType: true,
      },
    });

    for (const ticket of expiredTickets) {
      // Marcar ticket como expirado
      await prisma.ticket.update({
        where: { id: ticket.id },
        data: { status: 'EXPIRED' },
      });

      // Liberar la entrada (incrementar availableQty)
      await prisma.ticketType.update({
        where: { id: ticket.ticketTypeId },
        data: {
          availableQty: { increment: 1 },
          soldQty: { decrement: 1 },
        },
      });
    }

    return expiredTickets.length;
  }
}

