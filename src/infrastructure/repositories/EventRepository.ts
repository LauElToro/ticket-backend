import { prisma } from '../database/prisma';
import { randomBytes } from 'crypto';

export class EventRepository {
  async findMany(query: any) {
    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '20', 10);
    const skip = (page - 1) * limit;

    const where: any = {
      isActive: query.isActive !== 'false',
      // Solo mostrar eventos públicos en listados (a menos que se especifique lo contrario)
      isPublic: query.includePrivate === 'true' ? undefined : true,
    };

    if (query.category) {
      where.category = query.category;
    }

    if (query.city) {
      where.city = query.city;
    }

    if (query.search) {
      where.title = {
        contains: query.search,
        mode: 'insensitive',
      };
    }

    if (query.dateFrom) {
      where.date = { ...where.date, gte: new Date(query.dateFrom) };
    }

    if (query.dateTo) {
      where.date = { ...where.date, lte: new Date(query.dateTo) };
    }

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        skip,
        take: limit,
        include: {
          ticketTypes: true,
          tandas: {
            where: { isActive: true },
            include: {
              tandaTicketTypes: {
                include: {
                  ticketType: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
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
        orderBy: {
          date: 'asc',
        },
      }),
      prisma.event.count({ where }),
    ]);

    return {
      events,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string) {
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

  async findByPrivateLink(privateLink: string) {
    return prisma.event.findUnique({
      where: { privateLink },
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

  async create(data: any, organizerId: string) {
    const { ticketTypes, date, time, ...eventData } = data;

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
      // Generar un código único de 16 caracteres
      privateLink = randomBytes(8).toString('hex');
    }

    // Construir objeto de datos explícitamente
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
      organizerId,
      isPublic: eventData.isPublic !== undefined ? eventData.isPublic : true,
      privateLink: privateLink || null,
    };

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
        await prisma.tanda.create({
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

  async update(id: string, data: any) {
    return prisma.event.update({
      where: { id },
      data,
      include: {
        ticketTypes: true,
      },
    });
  }

  async delete(id: string) {
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
}

