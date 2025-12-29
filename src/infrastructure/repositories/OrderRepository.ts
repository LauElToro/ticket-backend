import { prisma } from '../database/prisma';
import { TicketRepository } from './TicketRepository';
import { Decimal } from '@prisma/client';

export class OrderRepository {
  private ticketRepository: TicketRepository;

  constructor() {
    this.ticketRepository = new TicketRepository();
  }

  async create(data: any, userId: string) {
    const { eventId, tickets, paymentMethod, referidoId } = data;

    // Obtener el evento con sus tandas para calcular precios
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        tandas: {
          where: { isActive: true },
          include: {
            tandaTicketTypes: {
              include: {
                ticketType: true,
              },
            },
          },
          orderBy: {
            startDate: 'asc',
          },
        },
        ticketTypes: true,
      },
    });

    if (!event) {
      throw new Error('Evento no encontrado');
    }

    // Encontrar la tanda activa (la que está en el rango de fechas actual)
    const now = new Date();
    let activeTanda = event.tandas.find((tanda) => {
      const startDate = tanda.startDate ? new Date(tanda.startDate) : null;
      const endDate = tanda.endDate ? new Date(tanda.endDate) : null;
      
      if (startDate && endDate) {
        return now >= startDate && now <= endDate;
      } else if (startDate) {
        return now >= startDate;
      } else if (endDate) {
        return now <= endDate;
      }
      return true; // Si no tiene fechas, considerar activa si isActive es true
    });

    // Si no hay tanda activa, usar la primera tanda activa o la primera disponible
    if (!activeTanda) {
      activeTanda = event.tandas.find((t) => t.isActive) || event.tandas[0];
    }

    if (!activeTanda) {
      throw new Error('No hay tandas activas para este evento');
    }

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

      // Obtener el precio desde la tanda activa
      const tandaTicketType = activeTanda.tandaTicketTypes.find(
        (ttt) => ttt.ticketTypeId === ticket.ticketTypeId
      );

      if (!tandaTicketType) {
        throw new Error(`No se encontró precio para ${ticketType.name} en la tanda activa`);
      }

      const price = Number(tandaTicketType.price);
      if (isNaN(price) || price <= 0) {
        throw new Error(`Precio inválido para ${ticketType.name}`);
      }

      totalAmount += price * ticket.quantity;
      ticketTypesData.push({
        ticketTypeId: ticket.ticketTypeId,
        quantity: ticket.quantity,
      });
    }

    // Si es pago en efectivo, crear tickets en estado PENDING_PAYMENT
    // Si no, crear la orden normalmente
    const isCashPayment = paymentMethod === 'CASH';
    
    // Si hay referidoId (puede ser ID o código), buscar el vendedor asociado
    let vendedorId: string | undefined;
    let finalReferidoId: string | undefined;
    if (referidoId) {
      // Intentar buscar por código primero (más común desde frontend)
      let referido = await prisma.referido.findUnique({
        where: { customCode: referidoId },
        include: {
          vendedor: true,
        },
      });
      
      // Si no se encuentra por código, intentar por ID
      if (!referido) {
        referido = await prisma.referido.findUnique({
          where: { id: referidoId },
          include: {
            vendedor: true,
          },
        });
      }
      
      if (referido) {
        finalReferidoId = referido.id;
        vendedorId = referido.vendedor.id;
        // Incrementar click count
        await prisma.referido.update({
          where: { id: referido.id },
          data: {
            clickCount: {
              increment: 1,
            },
          },
        });
      }
    }

    // Validar que totalAmount sea válido
    if (isNaN(totalAmount) || totalAmount <= 0) {
      throw new Error(`Total inválido: ${totalAmount}`);
    }

    // Crear la orden
    const order = await prisma.order.create({
      data: {
        userId,
        eventId,
        totalAmount: new Decimal(totalAmount),
        paymentMethod,
        paymentStatus: 'PENDING',
        reservedUntil: isCashPayment 
          ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 días para pagos en efectivo
          : new Date(Date.now() + 15 * 60 * 1000), // 15 minutos para otros métodos
        referidoId: finalReferidoId || null,
        vendedorId: vendedorId || null,
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
        event: {
          include: {
            ticketTypes: true,
          },
        },
        tickets: true,
      },
    });

    if (!order) {
      throw new Error('Orden no encontrada');
    }

    if (order.userId !== userId) {
      throw new Error('No autorizado');
    }

    // Si ya hay tickets creados (para pagos en efectivo), solo actualizar su estado
    if (order.tickets && order.tickets.length > 0) {
      // Actualizar tickets de PENDING_PAYMENT a ACTIVE
      await prisma.ticket.updateMany({
        where: {
          orderId,
          status: 'PENDING_PAYMENT',
        },
        data: {
          status: 'ACTIVE',
        },
      });

      // Calcular comisión del vendedor si existe
      if (order.vendedorId) {
        const vendedor = await prisma.vendedor.findUnique({
          where: { id: order.vendedorId },
        });
        if (vendedor) {
          const commission = (Number(order.totalAmount) * Number(vendedor.commissionPercent)) / 100;
          await prisma.vendedor.update({
            where: { id: order.vendedorId },
            data: {
              totalEarnings: {
                increment: commission,
              },
            },
          });
        }
      }

      // Incrementar conversion count del referido si existe
      if (order.referidoId) {
        await prisma.referido.update({
          where: { id: order.referidoId },
          data: {
            conversionCount: {
              increment: 1,
            },
          },
        });
      }

      // Actualizar estado de pago
      return await prisma.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: 'COMPLETED',
          paymentId: paymentData.paymentId || null,
          completedAt: new Date(),
        },
        include: {
          tickets: {
            include: {
              ticketType: true,
              event: true,
            },
          },
        },
      });
    }

    // Si no hay tickets, crearlos ahora
    // Obtener datos de tickets desde paymentData o desde el evento
    const ticketsData = paymentData.tickets || [];
    
    // Si no hay tickets en paymentData, intentar obtenerlos desde el evento
    if (ticketsData.length === 0 && order.event.ticketTypes.length > 0) {
      // Esto es un fallback - en producción debería venir en paymentData
      // Por ahora, crear un ticket por cada tipo disponible (esto no es ideal)
      throw new Error('Datos de tickets requeridos para confirmar el pago');
    }

    // Calcular comisión del vendedor si existe
    if (order.vendedorId) {
      const vendedor = await prisma.vendedor.findUnique({
        where: { id: order.vendedorId },
      });
      if (vendedor) {
        const commission = (Number(order.totalAmount) * Number(vendedor.commissionPercent)) / 100;
        await prisma.vendedor.update({
          where: { id: order.vendedorId },
          data: {
            totalEarnings: {
              increment: commission,
            },
          },
        });
      }
    }

    // Incrementar conversion count del referido si existe
    if (order.referidoId) {
      await prisma.referido.update({
        where: { id: order.referidoId },
        data: {
          conversionCount: {
            increment: 1,
          },
        },
      });
    }

    // Actualizar estado de pago primero
    await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: 'COMPLETED',
        paymentId: paymentData.paymentId || null,
        completedAt: new Date(),
      },
    });

    // Crear tickets
    if (ticketsData.length > 0) {
      await this.ticketRepository.createTicketsForOrder(orderId, ticketsData, 'ACTIVE');
    }

    // Retornar orden actualizada con tickets
    return await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        tickets: {
          include: {
            ticketType: true,
            event: true,
          },
        },
        event: true,
        user: true,
      },
    });
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

  async updatePaymentId(orderId: string, paymentId: string) {
    return prisma.order.update({
      where: { id: orderId },
      data: { paymentId },
    });
  }

  async updatePaymentStatus(orderId: string, status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REFUNDED') {
    return prisma.order.update({
      where: { id: orderId },
      data: { 
        paymentStatus: status,
        completedAt: status === 'COMPLETED' ? new Date() : undefined,
      },
    });
  }
}

