import { prisma } from '../database/prisma';
import { TicketRepository } from './TicketRepository';

export class OrderRepository {
  private ticketRepository: TicketRepository;

  constructor() {
    this.ticketRepository = new TicketRepository();
  }

  async create(data: any, userId: string) {
    const { eventId, tickets, paymentMethod } = data;

    // Calcular total
    let totalAmount = 0;
    const ticketTypesData = [];

    for (const ticket of tickets) {
      const ticketType = await prisma.ticketType.findUnique({
        where: { id: ticket.ticketTypeId },
      });

      if (!ticketType) {
        throw new Error(`Tipo de entrada no encontrado: ${ticket.ticketTypeId}`);
      }

      if (ticketType.availableQty < ticket.quantity) {
        throw new Error(`No hay suficientes entradas disponibles para ${ticketType.name}`);
      }

      totalAmount += Number(ticketType.price) * ticket.quantity;
      ticketTypesData.push({
        ticketTypeId: ticket.ticketTypeId,
        quantity: ticket.quantity,
      });
    }

    // Si es pago en efectivo, crear tickets en estado PENDING_PAYMENT
    // Si no, crear la orden normalmente
    const isCashPayment = paymentMethod === 'CASH';
    
    // Crear la orden
    const order = await prisma.order.create({
      data: {
        userId,
        eventId,
        totalAmount,
        paymentMethod,
        paymentStatus: 'PENDING',
        reservedUntil: isCashPayment 
          ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 días para pagos en efectivo
          : new Date(Date.now() + 15 * 60 * 1000), // 15 minutos para otros métodos
      },
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
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Si es pago en efectivo, crear tickets en estado PENDING_PAYMENT
    // Los tickets solo se crean cuando el pago está confirmado, pero para efectivo los creamos inmediatamente en estado pendiente
    if (isCashPayment && ticketTypesData.length > 0) {
      await this.ticketRepository.createTicketsForOrder(order.id, ticketTypesData, 'PENDING_PAYMENT');
    }

    return order;
  }

  async confirmPayment(orderId: string, paymentData: any, userId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        event: true,
      },
    });

    if (!order) {
      throw new Error('Orden no encontrada');
    }

    if (order.userId !== userId) {
      throw new Error('No autorizado');
    }

    // Actualizar estado de pago
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: 'COMPLETED',
        paymentId: paymentData.paymentId || null,
        completedAt: new Date(),
      },
    });

    // Obtener los tickets de la orden para crear las entradas
    const orderData = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        event: {
          include: {
            ticketTypes: true,
          },
        },
      },
    });

    // Crear tickets con QR
    // Nota: Esto debería venir del request, pero por ahora lo inferimos
    // En producción, esto debería venir del body del request
    const ticketsData = paymentData.tickets || [];
    
    if (ticketsData.length > 0) {
      await this.ticketRepository.createTicketsForOrder(orderId, ticketsData);
    }

    return updatedOrder;
  }

  async findById(id: string) {
    return prisma.order.findUnique({
      where: { id },
      include: {
        tickets: {
          include: {
            ticketType: true,
            event: true,
          },
        },
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
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            dni: true,
          },
        },
      },
    });
  }
}

