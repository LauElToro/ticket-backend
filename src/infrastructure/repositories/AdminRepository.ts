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

    // Generar privateLink si el evento es privado
    let privateLink: string | undefined = undefined;
    if (eventData.isPublic === false) {
      const { randomBytes } = await import('crypto');
      privateLink = randomBytes(8).toString('hex');
    }

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
      isPublic: eventData.isPublic !== undefined ? eventData.isPublic : true,
      privateLink: privateLink || null,
    };

    // Agregar coordenadas si están presentes
    if (latitude && longitude) {
      prismaData.latitude = parseFloat(latitude);
      prismaData.longitude = parseFloat(longitude);
    }

    // Crear el evento primero
    const event = await prisma.event.create({
      data: prismaData,
    });

    // Crear los tipos de entrada (sin precio, ya que el precio está en las tandas)
    const createdTicketTypes = await Promise.all(
      ticketTypes.map((tt: any) =>
        prisma.ticketType.create({
          data: {
            eventId: event.id,
            name: tt.name,
            totalQty: parseInt(String(tt.totalQty || 0)),
            availableQty: parseInt(String(tt.totalQty || 0)),
          },
        })
      )
    );

    // Crear las tandas con sus relaciones
    if (data.tandas && Array.isArray(data.tandas)) {
      for (const tandaData of data.tandas) {
        const tanda = await prisma.tanda.create({
          data: {
            eventId: event.id,
            name: tandaData.name || `Tanda ${data.tandas.indexOf(tandaData) + 1}`,
            startDate: new Date(tandaData.startDate),
            endDate: new Date(tandaData.endDate),
            isActive: tandaData.isActive !== undefined ? tandaData.isActive : true,
            tandaTicketTypes: {
              create: tandaData.ticketTypes?.map((ttData: any) => {
                const ticketType = createdTicketTypes.find(tt => tt.name === ttData.name);
                if (!ticketType) return null;
                return {
                  ticketTypeId: ticketType.id,
                  price: parseFloat(String(ttData.price || 0)),
                  quantity: parseInt(String(ttData.quantity || 0)),
                  availableQty: parseInt(String(ttData.quantity || 0)),
                };
              }).filter(Boolean) || [],
            },
          },
        });
      }
    }

    // Retornar el evento con todas las relaciones
    return prisma.event.findUnique({
      where: { id: event.id },
      include: {
        ticketTypes: {
          include: {
            tandaTicketTypes: {
              include: {
                tanda: true,
              },
            },
          },
        },
        tandas: {
          include: {
            tandaTicketTypes: {
              include: {
                ticketType: true,
              },
            },
          },
        },
      },
    });
  }

  async updateEvent(id: string, data: any, userId: string) {
    // Extraer ticketTypes y tandas primero para no incluirlos en eventData
    const { ticketTypes, tandas, date, time, latitude, longitude, ...eventData } = data;

    // Verificar que el evento existe y pertenece al usuario (si es organizador)
    const existingEvent = await prisma.event.findUnique({
      where: { id },
      include: { 
        ticketTypes: {
          include: {
            tandaTicketTypes: {
              include: {
                tanda: true,
              },
            },
          },
        },
        tandas: {
          include: {
            tandaTicketTypes: {
              include: {
                ticketType: true,
              },
            },
          },
        },
      },
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
    
    // Asegurarse de que ticketTypes y tandas no estén en updateData
    delete updateData.ticketTypes;
    delete updateData.tandas;

    // Manejar isPublic y privateLink
    if (eventData.isPublic !== undefined) {
      updateData.isPublic = eventData.isPublic;
      
      // Si cambia a privado y no tiene privateLink, generar uno
      if (eventData.isPublic === false && !existingEvent.privateLink) {
        const { randomBytes } = await import('crypto');
        updateData.privateLink = randomBytes(8).toString('hex');
      }
      // Si cambia a público, eliminar el privateLink
      else if (eventData.isPublic === true) {
        updateData.privateLink = null;
      }
    }

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

    // Actualizar el evento primero
    const updatedEvent = await prisma.event.update({
      where: { id },
      data: updateData,
    });

    // Manejar tipos de entrada
    if (ticketTypes && Array.isArray(ticketTypes)) {
      const existingTicketTypeIds = existingEvent.ticketTypes.map(tt => tt.id);
      
      // Calcular totalQty para cada tipo sumando las cantidades de todas las tandas
      const ticketTypesWithTotals = ticketTypes.map((tt: any) => {
        const totalQty = tandas?.reduce((sum: number, tanda: any) => {
          const tandaType = tanda.ticketTypes?.find((t: any) => t.name === tt.name);
          return sum + (tandaType ? parseInt(String(tandaType.quantity || 0)) : 0);
        }, 0) || parseInt(String(tt.totalQty)) || 0;
        return { ...tt, totalQty };
      });

      // Actualizar o crear tipos de entrada
      for (const tt of ticketTypesWithTotals) {
        if (tt.id && existingTicketTypeIds.includes(tt.id)) {
          await prisma.ticketType.update({
            where: { id: tt.id },
            data: {
              name: tt.name,
              totalQty: tt.totalQty,
              availableQty: tt.totalQty,
            },
          });
        } else {
          await prisma.ticketType.create({
            data: {
              eventId: id,
              name: tt.name,
              totalQty: tt.totalQty,
              availableQty: tt.totalQty,
            },
          });
        }
      }

      // Eliminar tipos de entrada que ya no existen
      for (const existingId of existingTicketTypeIds) {
        if (!ticketTypes.some((tt: any) => tt.id === existingId)) {
          await prisma.ticketType.delete({ where: { id: existingId } });
        }
      }
    }

    // Obtener tipos de entrada actualizados
    const currentTicketTypes = await prisma.ticketType.findMany({
      where: { eventId: id },
    });

    // Manejar tandas
    if (tandas && Array.isArray(tandas)) {
      const existingTandaIds = existingEvent.tandas.map(t => t.id);

      for (const tandaData of tandas) {
        let tanda;
        
        if (tandaData.id && existingTandaIds.includes(tandaData.id)) {
          // Actualizar tanda existente
          tanda = await prisma.tanda.update({
            where: { id: tandaData.id },
            data: {
              name: tandaData.name,
              startDate: new Date(tandaData.startDate),
              endDate: new Date(tandaData.endDate),
              isActive: tandaData.isActive !== undefined ? tandaData.isActive : true,
            },
          });

          // Eliminar relaciones existentes
          await prisma.tandaTicketType.deleteMany({
            where: { tandaId: tanda.id },
          });
        } else {
          // Crear nueva tanda
          tanda = await prisma.tanda.create({
            data: {
              eventId: id,
              name: tandaData.name,
              startDate: new Date(tandaData.startDate),
              endDate: new Date(tandaData.endDate),
              isActive: tandaData.isActive !== undefined ? tandaData.isActive : true,
            },
          });
        }

        // Crear relaciones con tipos de entrada
        if (tandaData.ticketTypes && Array.isArray(tandaData.ticketTypes)) {
          for (const ttData of tandaData.ticketTypes) {
            const ticketType = currentTicketTypes.find(tt => tt.name === ttData.name);
            if (ticketType) {
              await prisma.tandaTicketType.create({
                data: {
                  tandaId: tanda.id,
                  ticketTypeId: ticketType.id,
                  price: parseFloat(String(ttData.price || 0)),
                  quantity: parseInt(String(ttData.quantity || 0)),
                  availableQty: parseInt(String(ttData.quantity || 0)),
                },
              });
            }
          }
        }
      }

      // Eliminar tandas que ya no existen
      for (const existingId of existingTandaIds) {
        if (!tandas.some((t: any) => t.id === existingId)) {
          await prisma.tanda.delete({ where: { id: existingId } });
        }
      }
    }

    // Retornar el evento actualizado con todas las relaciones
    return prisma.event.findUnique({
      where: { id },
      include: {
        ticketTypes: {
          include: {
            tandaTicketTypes: {
              include: {
                tanda: true,
              },
            },
          },
        },
        tandas: {
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
    // Verificar si el evento ya pasó
    const event = await prisma.event.findUnique({
      where: { id },
      select: { date: true },
    });

    if (!event) {
      throw new Error('Evento no encontrado');
    }

    // Si el evento ya pasó, no se puede borrar (solo desactivar)
    const now = new Date();
    if (event.date < now) {
      throw new Error('No se puede borrar un evento que ya pasó. Solo se puede desactivar.');
    }

    // Si el evento no ha pasado, se puede borrar físicamente
    return prisma.event.delete({
      where: { id },
    });
  }

  async getUsers(query: any) {
    const where: any = {};
    
    // Filtrar por rol si se especifica
    if (query.role && query.role !== 'all') {
      where.role = query.role;
    }

    // Filtrar por organizador si se especifica (para ver solo sus vendedores/porteros)
    if (query.assignedBy) {
      const assignedByConditions: any[] = [
        { vendedorProfile: { assignedBy: query.assignedBy } },
        { porteroProfile: { assignedBy: query.assignedBy } }
      ];
      
      // Si hay filtro por rol, combinarlo con el filtro de assignedBy
      if (where.role) {
        where.AND = [
          { role: where.role },
          { OR: assignedByConditions }
        ];
        delete where.role; // Ya está incluido en AND
      } else {
        // Solo filtro por assignedBy
        where.OR = assignedByConditions;
      }
    }

    return prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        dni: true,
        phone: true,
        role: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        vendedorProfile: {
          include: {
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
                events: true,
              },
            },
          },
        },
        porteroProfile: {
          include: {
            assignedByUser: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        _count: {
          select: {
            ticketsPurchased: true,
            orders: true,
            eventsCreated: true,
            validations: true, // Para contar escaneos del portero
          },
        },
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
          include: {
            event: {
              select: {
                id: true,
                title: true,
                date: true,
              },
            },
            ticketType: {
              select: {
                id: true,
                name: true,
                price: true,
              },
            },
          },
        },
        orders: {
          take: 10,
          include: {
            event: {
              select: {
                id: true,
                title: true,
                date: true,
              },
            },
            tickets: {
              select: {
                id: true,
                status: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        eventsCreated: {
          take: 10,
          select: {
            id: true,
            title: true,
            date: true,
            isActive: true,
            _count: {
              select: {
                tickets: true,
                orders: true,
              },
            },
          },
        },
        vendedorProfile: {
          include: {
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
                  select: {
                    id: true,
                    title: true,
                    date: true,
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
            sales: {
              take: 10,
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
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
              orderBy: {
                createdAt: 'desc',
              },
            },
          },
        },
            porteroProfile: {
              include: {
                assignedByUser: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
            validations: {
              take: 10,
              include: {
                ticket: {
                  include: {
                    event: {
                      select: {
                        id: true,
                        title: true,
                        date: true,
                      },
                    },
                    owner: {
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
                scannedAt: 'desc',
              },
            },
      },
    });
  }

  async updateUser(id: string, data: any) {
    const { role, ...userData } = data;
    
    const updateData: any = {
      ...userData,
    };

    // Solo permitir cambiar el rol si se proporciona
    if (role) {
      updateData.role = role;
    }

    return prisma.user.update({
      where: { id },
      data: updateData,
      include: {
        vendedorProfile: true,
        porteroProfile: true,
      },
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

