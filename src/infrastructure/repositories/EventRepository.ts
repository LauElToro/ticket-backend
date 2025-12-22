import { prisma } from '../database/prisma';

export class EventRepository {
  async findMany(query: any) {
    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '20', 10);
    const skip = (page - 1) * limit;

    const where: any = {
      isActive: query.isActive !== 'false',
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
    };

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
    return prisma.event.update({
      where: { id },
      data: { isActive: false },
    });
  }
}

