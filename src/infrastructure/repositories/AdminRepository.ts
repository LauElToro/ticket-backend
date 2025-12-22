import { prisma } from '../database/prisma';

export class AdminRepository {
  async getDashboard(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    const isAdmin = user?.role === 'ADMIN';
    const isOrganizer = user?.role === 'ORGANIZER';

    // Estadísticas generales (solo admin)
    const [totalEvents, totalUsers, totalTickets, totalRevenue, recentOrders] = await Promise.all([
      isAdmin 
        ? prisma.event.count()
        : prisma.event.count({ where: { organizerId: userId } }),
      isAdmin ? prisma.user.count() : Promise.resolve(0),
      isAdmin
        ? prisma.ticket.count()
        : prisma.ticket.count({
            where: {
              event: { organizerId: userId },
            },
          }),
      isAdmin
        ? prisma.order.aggregate({
            _sum: { totalAmount: true },
            where: { paymentStatus: 'COMPLETED' },
          })
        : prisma.order.aggregate({
            _sum: { totalAmount: true },
            where: {
              paymentStatus: 'COMPLETED',
              event: { organizerId: userId },
            },
          }),
      isAdmin
        ? prisma.order.findMany({
            take: 10,
            orderBy: { createdAt: 'desc' },
            include: {
              user: { select: { name: true, email: true } },
              event: { select: { title: true } },
            },
          })
        : prisma.order.findMany({
            take: 10,
            where: { event: { organizerId: userId } },
            orderBy: { createdAt: 'desc' },
            include: {
              user: { select: { name: true, email: true } },
              event: { select: { title: true } },
            },
          }),
    ]);

    // Eventos próximos
    const upcomingEvents = await prisma.event.findMany({
      where: {
        ...(isOrganizer && !isAdmin ? { organizerId: userId } : {}),
        date: { gte: new Date() },
        isActive: true,
      },
      take: 5,
      orderBy: { date: 'asc' },
      include: {
        ticketTypes: true,
        _count: {
          select: { tickets: true },
        },
      },
    });

    // Eventos más vendidos (top 5)
    const topEvents = await prisma.event.findMany({
      where: {
        ...(isOrganizer && !isAdmin ? { organizerId: userId } : {}),
        isActive: true,
      },
      include: {
        _count: {
          select: { tickets: true },
        },
        ticketTypes: true,
      },
      orderBy: {
        tickets: {
          _count: 'desc',
        },
      },
      take: 5,
    });

    // Ventas por mes (últimos 6 meses)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const salesByMonth = await prisma.order.findMany({
      where: {
        paymentStatus: 'COMPLETED',
        createdAt: { gte: sixMonthsAgo },
        ...(isOrganizer && !isAdmin ? { event: { organizerId: userId } } : {}),
      },
      select: {
        totalAmount: true,
        createdAt: true,
      },
    });

    // Agrupar por mes
    const monthlySales = salesByMonth.reduce((acc: any, order) => {
      const month = new Date(order.createdAt).toISOString().slice(0, 7);
      acc[month] = (acc[month] || 0) + Number(order.totalAmount);
      return acc;
    }, {});

    return {
      stats: {
        totalEvents,
        totalUsers: isAdmin ? totalUsers : undefined,
        totalTickets,
        totalRevenue: totalRevenue._sum.totalAmount || 0,
      },
      recentOrders,
      upcomingEvents,
      topEvents,
      monthlySales: Object.entries(monthlySales).map(([month, amount]) => ({
        month,
        amount,
      })),
    };
  }

  async getEventById(id: string, userId?: string) {
    const user = userId 
      ? await prisma.user.findUnique({ where: { id: userId }, select: { role: true } })
      : null;
    
    const isOrganizer = user?.role === 'ORGANIZER' && user?.role !== 'ADMIN';

    const event = await prisma.event.findUnique({
      where: { id },
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
    });

    // Verificar permisos: si es organizador, solo puede ver sus propios eventos
    if (isOrganizer && event && event.organizerId !== userId) {
      throw new Error('No autorizado para ver este evento');
    }

    return event;
  }

  async getEvents(query: any, userId?: string) {
    const user = userId 
      ? await prisma.user.findUnique({ where: { id: userId }, select: { role: true } })
      : null;
    
    const isOrganizer = user?.role === 'ORGANIZER' && user?.role !== 'ADMIN';

    return prisma.event.findMany({
      where: {
        ...(isOrganizer ? { organizerId: userId } : {}),
        ...(query.search ? {
          OR: [
            { title: { contains: query.search, mode: 'insensitive' } },
            { category: { contains: query.search, mode: 'insensitive' } },
          ],
        } : {}),
        ...(query.isActive !== undefined ? { isActive: query.isActive === 'true' } : {}),
      },
      include: {
        ticketTypes: true,
        organizer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            tickets: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async createEvent(data: any, userId: string) {
    const { ticketTypes, date, time, latitude, longitude, ...eventData } = data;

    // Validar campos requeridos
    if (!date) {
      throw new Error('Fecha requerida');
    }
    if (!time) {
      throw new Error('Hora requerida');
    }

    // Convertir fecha y hora a DateTime
    const [year, month, day] = date.split('-');
    const [hours, minutes] = time.split(':');
    const eventDateTime = new Date(`${year}-${month}-${day}T${hours}:${minutes}:00`);

    // Construir objeto de datos explícitamente para asegurar que todos los campos estén presentes
    const prismaData: any = {
      title: eventData.title,
      subtitle: eventData.subtitle || null,
      description: eventData.description || null,
      category: eventData.category,
      image: eventData.image || null,
      venue: eventData.venue,
      address: eventData.address || null,
      city: eventData.city,
      date: eventDateTime,
      time: time, // Incluir time explícitamente
      organizerId: userId,
    };

    // Agregar coordenadas si están presentes
    if (latitude && longitude) {
      prismaData.latitude = parseFloat(latitude);
      prismaData.longitude = parseFloat(longitude);
    }

    return prisma.event.create({
      data: {
        ...prismaData,
        ticketTypes: {
          create: ticketTypes.map((tt: any) => ({
            name: tt.name,
            price: tt.price,
            totalQty: tt.totalQty,
            availableQty: tt.totalQty,
          })),
        },
      },
      include: {
        ticketTypes: true,
      },
    });
  }

  async updateEvent(id: string, data: any, userId: string) {
    // Extraer ticketTypes primero para no incluirlo en eventData
    const { ticketTypes, date, time, latitude, longitude, ...eventData } = data;

    // Verificar que el evento existe y pertenece al usuario (si es organizador)
    const existingEvent = await prisma.event.findUnique({
      where: { id },
      include: { ticketTypes: true },
    });

    if (!existingEvent) {
      throw new Error('Evento no encontrado');
    }

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    const isOrganizer = user?.role === 'ORGANIZER' && user?.role !== 'ADMIN';
    
    if (isOrganizer && existingEvent.organizerId !== userId) {
      throw new Error('No autorizado para editar este evento');
    }

    // Construir updateData sin ticketTypes
    const updateData: any = { ...eventData };
    
    // Asegurarse de que ticketTypes no esté en updateData
    delete updateData.ticketTypes;

    // Convertir fecha y hora a DateTime si están presentes
    if (date) {
      let eventDateTime: Date;
      if (time) {
        const [year, month, day] = date.split('-');
        const [hours, minutes] = time.split(':');
        eventDateTime = new Date(`${year}-${month}-${day}T${hours}:${minutes}:00`);
      } else {
        eventDateTime = new Date(date);
      }
      updateData.date = eventDateTime;
    }

    // Incluir time si está presente
    if (time !== undefined) {
      updateData.time = time;
    }

    // Agregar coordenadas si están presentes
    if (latitude && longitude) {
      updateData.latitude = parseFloat(latitude);
      updateData.longitude = parseFloat(longitude);
    }

    // Manejar tipos de entrada si están presentes
    if (ticketTypes && Array.isArray(ticketTypes)) {
      // Obtener IDs de tipos de entrada existentes
      const existingTicketTypeIds = existingEvent.ticketTypes.map(tt => tt.id);
      
      // Separar tipos de entrada en: nuevos, actualizados y eliminados
      const ticketTypesToCreate: any[] = [];
      const ticketTypesToUpdate: Array<{ where: { id: string }; data: any }> = [];
      const ticketTypesToDelete: Array<{ id: string }> = [];

      for (const tt of ticketTypes) {
        if (tt.id && existingTicketTypeIds.includes(tt.id)) {
          // Tipo de entrada existente - actualizar
          const existingTT = existingEvent.ticketTypes.find(e => e.id === tt.id);
          const oldTotalQty = existingTT?.totalQty || 0;
          const newTotalQty = parseInt(String(tt.totalQty));
          const difference = newTotalQty - oldTotalQty;
          
          ticketTypesToUpdate.push({
            where: { id: tt.id },
            data: {
              name: tt.name,
              price: parseFloat(String(tt.price)),
              totalQty: newTotalQty,
              // Incrementar availableQty por la diferencia en totalQty
              availableQty: {
                increment: difference,
              },
            },
          });
        } else {
          // Nuevo tipo de entrada
          ticketTypesToCreate.push({
            name: tt.name,
            price: parseFloat(String(tt.price)),
            totalQty: parseInt(String(tt.totalQty)),
            availableQty: parseInt(String(tt.totalQty)),
          });
        }
      }

      // Identificar tipos de entrada a eliminar (existen en BD pero no en el request)
      for (const existingId of existingTicketTypeIds) {
        if (!ticketTypes.some((tt: any) => tt.id === existingId)) {
          ticketTypesToDelete.push({ id: existingId });
        }
      }

      // Construir objeto de actualización de tipos de entrada para Prisma
      const ticketTypesUpdate: any = {};
      
      if (ticketTypesToCreate.length > 0) {
        ticketTypesUpdate.create = ticketTypesToCreate;
      }
      
      if (ticketTypesToUpdate.length > 0) {
        ticketTypesUpdate.update = ticketTypesToUpdate;
      }
      
      if (ticketTypesToDelete.length > 0) {
        ticketTypesUpdate.delete = ticketTypesToDelete;
      }

      // Solo agregar ticketTypes si hay cambios y tiene al menos una operación
      if (Object.keys(ticketTypesUpdate).length > 0) {
        updateData.ticketTypes = ticketTypesUpdate;
      }
    }

    // Actualizar el evento
    return prisma.event.update({
      where: { id },
      data: updateData,
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
    });
  }

  async deleteEvent(id: string, userId: string) {
    return prisma.event.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async getUsers(query: any) {
    return prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        dni: true,
        role: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getUserById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      include: {
        ticketsPurchased: {
          take: 10,
        },
        eventsCreated: {
          take: 10,
        },
      },
    });
  }

  async updateUser(id: string, data: any) {
    return prisma.user.update({
      where: { id },
      data,
    });
  }

  async blockUser(id: string) {
    // TODO: Implementar bloqueo de usuario
    return prisma.user.findUnique({
      where: { id },
    });
  }

  async getEventStats(eventId: string) {
    const [event, ticketsSold, ticketsScanned, revenue] = await Promise.all([
      prisma.event.findUnique({
        where: { id: eventId },
        include: {
          ticketTypes: {
            select: {
              id: true,
              name: true,
              price: true,
              totalQty: true,
              soldQty: true,
              availableQty: true,
            },
          },
        },
      }),
      prisma.ticket.count({
        where: {
          eventId,
          status: {
            in: ['ACTIVE', 'USED'],
          },
        },
      }),
      prisma.ticket.count({
        where: {
          eventId,
          status: 'USED',
        },
      }),
      prisma.order.aggregate({
        _sum: {
          totalAmount: true,
        },
        where: {
          eventId,
          paymentStatus: 'COMPLETED',
        },
      }),
    ]);

    return {
      event,
      ticketsSold,
      ticketsScanned,
      revenue: revenue._sum.totalAmount || 0,
    };
  }
}

