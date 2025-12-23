import { prisma } from '../database/prisma';

export class VendedorRepository {
  async create(data: {
    userId: string;
    assignedBy: string;
    commissionPercent: number;
  }) {
    return prisma.vendedor.create({
      data: {
        userId: data.userId,
        assignedBy: data.assignedBy,
        commissionPercent: data.commissionPercent,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            dni: true,
            phone: true,
          },
        },
        assignedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async findByUserId(userId: string) {
    return prisma.vendedor.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            dni: true,
            phone: true,
          },
        },
        assignedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        events: {
          include: {
            event: {
              include: {
                ticketTypes: true,
              },
            },
          },
        },
        referidos: {
          include: {
            event: {
              select: {
                id: true,
                title: true,
                date: true,
              },
            },
          },
        },
      },
    });
  }

  async findById(id: string) {
    return prisma.vendedor.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            dni: true,
            phone: true,
          },
        },
        assignedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async assignEvent(vendedorId: string, eventId: string, ticketLimit?: number) {
    return prisma.vendedorEvent.create({
      data: {
        vendedorId,
        eventId,
        ticketLimit,
      },
      include: {
        event: {
          include: {
            ticketTypes: true,
          },
        },
      },
    });
  }

  async getVendedorEvents(vendedorId: string) {
    return prisma.vendedorEvent.findMany({
      where: { vendedorId },
      include: {
        event: {
          include: {
            ticketTypes: true,
            organizer: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        event: {
          date: 'desc',
        },
      },
    });
  }

  async getVendedorMetrics(vendedorId: string) {
    const vendedor = await prisma.vendedor.findUnique({
      where: { id: vendedorId },
      include: {
        sales: {
          where: {
            paymentStatus: 'COMPLETED',
          },
          include: {
            event: {
              select: {
                id: true,
                title: true,
                date: true,
              },
            },
            tickets: {
              include: {
                ticketType: true,
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
        },
      },
    });

    if (!vendedor) return null;

    const totalSales = vendedor.sales.length;
    const totalRevenue = vendedor.sales.reduce((sum, order) => {
      return sum + Number(order.totalAmount);
    }, 0);
    const totalEarnings = (totalRevenue * Number(vendedor.commissionPercent)) / 100;
    const totalTicketsSold = vendedor.sales.reduce((sum, order) => {
      return sum + order.tickets.length;
    }, 0);

    // Agrupar por evento
    const salesByEvent = vendedor.sales.reduce((acc: any, order) => {
      const eventId = order.eventId;
      if (!acc[eventId]) {
        acc[eventId] = {
          event: order.event,
          orders: [],
          revenue: 0,
          ticketsSold: 0,
        };
      }
      acc[eventId].orders.push(order);
      acc[eventId].revenue += Number(order.totalAmount);
      acc[eventId].ticketsSold += order.tickets.length;
      return acc;
    }, {});

    return {
      vendedor: {
        id: vendedor.id,
        commissionPercent: vendedor.commissionPercent,
        totalEarnings: Number(vendedor.totalEarnings),
      },
      metrics: {
        totalSales,
        totalRevenue,
        totalEarnings,
        totalTicketsSold,
        salesByEvent: Object.values(salesByEvent),
      },
    };
  }

  async getAllVendedores(assignedBy?: string) {
    return prisma.vendedor.findMany({
      where: assignedBy ? { assignedBy } : undefined,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            dni: true,
            phone: true,
          },
        },
        assignedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            sales: {
              where: {
                paymentStatus: 'COMPLETED',
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async updateEarnings(vendedorId: string, amount: number) {
    return prisma.vendedor.update({
      where: { id: vendedorId },
      data: {
        totalEarnings: {
          increment: amount,
        },
      },
    });
  }

  async incrementSoldQty(vendedorEventId: string, quantity: number) {
    return prisma.vendedorEvent.update({
      where: { id: vendedorEventId },
      data: {
        soldQty: {
          increment: quantity,
        },
      },
    });
  }
}

