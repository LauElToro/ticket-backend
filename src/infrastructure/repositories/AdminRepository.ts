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

  async cloneEvent(eventId: string, userId: string) {
    const original = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        ticketTypes: true,
        tandas: {
          include: {
            tandaTicketTypes: {
              include: { ticketType: true },
            },
          },
        },
      },
    });

    if (!original) throw new Error('Evento no encontrado');
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    const isOrganizer = user?.role === 'ORGANIZER';
    if (isOrganizer && original.organizerId !== userId) {
      throw new Error('No autorizado para clonar este evento');
    }

    const { randomBytes } = await import('crypto');
    const privateLink = original.isPublic ? null : randomBytes(8).toString('hex');
    const newDate = new Date(original.date);
    newDate.setDate(newDate.getDate() + 1);

    const newEvent = await prisma.event.create({
      data: {
        title: `${original.title} (Copia)`,
        subtitle: original.subtitle,
        description: original.description,
        image: original.image,
        category: original.category,
        date: newDate,
        time: original.time,
        venue: original.venue,
        address: original.address,
        city: original.city,
        latitude: original.latitude,
        longitude: original.longitude,
        organizerId: userId,
        isActive: true,
        isPublic: original.isPublic,
        privateLink,
        metaPixelId: original.metaPixelId,
        googleAdsId: original.googleAdsId,
      },
    });

    const ttIdMap: Record<string, string> = {};
    for (const tt of original.ticketTypes) {
      const created = await prisma.ticketType.create({
        data: {
          eventId: newEvent.id,
          name: tt.name,
          totalQty: tt.totalQty,
          soldQty: 0,
          availableQty: tt.totalQty,
        },
      });
      ttIdMap[tt.id] = created.id;
    }

    for (const tanda of original.tandas) {
      const newTanda = await prisma.tanda.create({
        data: {
          eventId: newEvent.id,
          name: tanda.name,
          startDate: tanda.startDate,
          endDate: tanda.endDate,
          isActive: true,
        },
      });
      for (const ttt of tanda.tandaTicketTypes) {
        const newTtId = ttIdMap[ttt.ticketTypeId];
        if (newTtId) {
          await prisma.tandaTicketType.create({
            data: {
              tandaId: newTanda.id,
              ticketTypeId: newTtId,
              price: ttt.price,
              quantity: ttt.quantity,
              soldQty: 0,
              availableQty: ttt.quantity,
            },
          });
        }
      }
    }

    return prisma.event.findUnique({
      where: { id: newEvent.id },
      include: {
        ticketTypes: true,
        tandas: { include: { tandaTicketTypes: true } },
      },
    });
  }

  async getEventValidations(eventId: string, userId: string) {
    const event = await prisma.event.findUnique({ where: { id: eventId }, select: { organizerId: true } });
    if (!event) throw new Error('Evento no encontrado');
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    const isOrganizer = user?.role === 'ORGANIZER';
    if (isOrganizer && event.organizerId !== userId) {
      throw new Error('No autorizado');
    }
    return prisma.ticketValidation.findMany({
      where: { ticket: { eventId } },
      include: {
        ticket: {
          include: {
            ticketType: true,
            owner: { select: { name: true, email: true } },
          },
        },
        validator: { select: { name: true } },
      },
      orderBy: { scannedAt: 'desc' },
      take: 500,
    });
  }

  async getPromoCodes(eventId: string, userId: string) {
    const event = await prisma.event.findUnique({ where: { id: eventId }, select: { organizerId: true } });
    if (!event) throw new Error('Evento no encontrado');
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    const isOrganizer = user?.role === 'ORGANIZER';
    if (isOrganizer && event.organizerId !== userId) throw new Error('No autorizado');
    return prisma.promoCode.findMany({
      where: { eventId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createPromoCode(eventId: string, data: any, userId: string) {
    const event = await prisma.event.findUnique({ where: { id: eventId }, select: { organizerId: true } });
    if (!event) throw new Error('Evento no encontrado');
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    const isOrganizer = user?.role === 'ORGANIZER';
    if (isOrganizer && event.organizerId !== userId) throw new Error('No autorizado');
    const code = String(data.code || '').toUpperCase().trim();
    if (!code) throw new Error('El código es requerido');
    const existing = await prisma.promoCode.findUnique({ where: { eventId_code: { eventId, code } } });
    if (existing) throw new Error('Ya existe un código con ese nombre para este evento');
    return prisma.promoCode.create({
      data: {
        eventId,
        code,
        discountType: data.discountType || 'PERCENT',
        discountValue: parseFloat(String(data.discountValue || 0)),
        maxUses: parseInt(String(data.maxUses || 0)) || 0,
        validFrom: data.validFrom ? new Date(data.validFrom) : null,
        validUntil: data.validUntil ? new Date(data.validUntil) : null,
      },
    });
  }

  async updatePromoCode(promoId: string, data: any, userId: string) {
    const promo = await prisma.promoCode.findUnique({ where: { id: promoId }, include: { event: true } });
    if (!promo) throw new Error('Código no encontrado');
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    const isOrganizer = user?.role === 'ORGANIZER';
    if (isOrganizer && promo.event.organizerId !== userId) throw new Error('No autorizado');
    return prisma.promoCode.update({
      where: { id: promoId },
      data: {
        ...(data.discountType && { discountType: data.discountType }),
        ...(data.discountValue !== undefined && { discountValue: parseFloat(String(data.discountValue)) }),
        ...(data.maxUses !== undefined && { maxUses: parseInt(String(data.maxUses)) || 0 }),
        ...(data.validFrom !== undefined && { validFrom: data.validFrom ? new Date(data.validFrom) : null }),
        ...(data.validUntil !== undefined && { validUntil: data.validUntil ? new Date(data.validUntil) : null }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });
  }

  async deletePromoCode(promoId: string, userId: string) {
    const promo = await prisma.promoCode.findUnique({ where: { id: promoId }, include: { event: true } });
    if (!promo) throw new Error('Código no encontrado');
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    const isOrganizer = user?.role === 'ORGANIZER';
    if (isOrganizer && promo.event.organizerId !== userId) throw new Error('No autorizado');
    return prisma.promoCode.delete({ where: { id: promoId } });
  }

  async getEventById(id: string, userId?: string) {
    const user = userId 
      ? await prisma.user.findUnique({ where: { id: userId }, select: { role: true } })
      : null;
    
    const isOrganizer = user?.role === 'ORGANIZER';

    const event = await prisma.event.findUnique({
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
    
    const isOrganizer = user?.role === 'ORGANIZER';

    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '20', 10);
    const skip = (page - 1) * limit;

    const where: any = {
      ...(isOrganizer ? { organizerId: userId } : {}),
      ...(query.search ? {
        OR: [
          { title: { contains: query.search, mode: 'insensitive' } },
          { category: { contains: query.search, mode: 'insensitive' } },
        ],
      } : {}),
      ...(query.isActive !== undefined ? { isActive: query.isActive === 'true' } : {}),
    };

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
          _count: {
            select: {
              tickets: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
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

  async createEvent(data: any, userId: string) {
    const { ticketTypes = [], tandas, date, time, endDate, endTime, latitude, longitude, ...eventData } = data;

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

    // eventType: PUBLICO | PRIVADO | OCULTO | INACTIVO
    const eventType = eventData.eventType || 'PUBLICO';
    const isPublic = eventType === 'PUBLICO';
    const isActive = eventType !== 'INACTIVO';

    // Generar privateLink si el evento es privado u oculto (solo por link)
    let privateLink: string | undefined = undefined;
    if (eventType === 'PRIVADO' || eventType === 'OCULTO') {
      const { randomBytes } = await import('crypto');
      privateLink = randomBytes(8).toString('hex');
    }

    // Obtener configuración global de tracking si no se especifica en el evento
    let metaPixelId = eventData.metaPixelId || null;
    let googleAdsId = eventData.googleAdsId || null;
    
    if (!metaPixelId || !googleAdsId) {
      const trackingConfig = await prisma.trackingConfig.findUnique({
        where: { userId },
      });
      if (trackingConfig) {
        metaPixelId = metaPixelId || trackingConfig.metaPixelId;
        googleAdsId = googleAdsId || trackingConfig.googleAdsId;
      }
    }

    // endDateTime opcional
    let endDateTime: Date | null = null;
    if (endDate && endTime) {
      const [ey, em, ed] = endDate.split('-');
      const [eh, emin] = endTime.split(':');
      endDateTime = new Date(`${ey}-${em}-${ed}T${eh}:${emin}:00`);
    }

    // Código de autorización: 4 dígitos únicos (se genera al crear el evento)
    const generateAuthCode = async (): Promise<string> => {
      const { randomInt } = await import('crypto');
      for (let i = 0; i < 50; i++) {
        const code = String(randomInt(1000, 9999));
        const existing = await prisma.event.findFirst({ where: { authorizationCode: code } });
        if (!existing) return code;
      }
      return String(randomInt(1000, 9999)); // fallback
    };
    const authorizationCode = await generateAuthCode();

    // Construir objeto de datos explícitamente para asegurar que todos los campos estén presentes
    const prismaData: any = {
      title: eventData.title,
      subtitle: eventData.subtitle || null,
      description: eventData.description || null,
      category: eventData.category || 'Otro',
      image: eventData.image || null,
      venue: eventData.venue || '',
      address: eventData.address || null,
      city: eventData.city || '',
      region: eventData.region || null,
      country: eventData.country || null,
      date: eventDateTime,
      time: time,
      endDate: endDateTime,
      endTime: endTime || null,
      organizerId: userId,
      isPublic,
      isActive,
      eventType,
      eventMode: eventData.eventMode || null,
      ageRestriction: !!eventData.ageRestriction,
      minAge: eventData.ageRestriction && eventData.minAge != null ? parseInt(String(eventData.minAge), 10) : null,
      privateLink: privateLink || null,
      metaPixelId: metaPixelId,
      googleAdsId: googleAdsId,
      authorizationCode,
      bannerTop: eventData.bannerTop || null,
      bannerEmail: eventData.bannerEmail || null,
    };

    // Agregar coordenadas si están presentes
    if (latitude != null && longitude != null) {
      prismaData.latitude = parseFloat(latitude);
      prismaData.longitude = parseFloat(longitude);
    }

    // Crear el evento primero
    const event = await prisma.event.create({
      data: prismaData,
    });

    // Crear los tipos de entrada si se envían (flujo por pasos puede crear evento sin tickets primero)
    const createdTicketTypes = await Promise.all(
      (Array.isArray(ticketTypes) ? ticketTypes : []).map((tt: any) =>
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
    const { ticketTypes, tandas, date, time, endDate, endTime, latitude, longitude, ...eventData } = data;

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
    const isOrganizer = user?.role === 'ORGANIZER';
    
    if (isOrganizer && existingEvent.organizerId !== userId) {
      throw new Error('No autorizado para editar este evento');
    }

    // Obtener configuración global de tracking si no se especifica en el evento
    let metaPixelId = eventData.metaPixelId !== undefined ? eventData.metaPixelId : existingEvent.metaPixelId;
    let googleAdsId = eventData.googleAdsId !== undefined ? eventData.googleAdsId : existingEvent.googleAdsId;
    
    if (!metaPixelId || !googleAdsId) {
      const trackingConfig = await prisma.trackingConfig.findUnique({
        where: { userId },
      });
      if (trackingConfig) {
        metaPixelId = metaPixelId || trackingConfig.metaPixelId;
        googleAdsId = googleAdsId || trackingConfig.googleAdsId;
      }
    }

    // Construir updateData sin ticketTypes
    const updateData: any = { ...eventData };
    
    // Asegurarse de que ticketTypes y tandas no estén en updateData
    delete updateData.ticketTypes;
    delete updateData.tandas;
    
    // Incluir campos de tracking
    if (metaPixelId !== undefined) {
      updateData.metaPixelId = metaPixelId;
    }
    if (googleAdsId !== undefined) {
      updateData.googleAdsId = googleAdsId;
    }

    // Manejar eventType (PUBLICO | PRIVADO | OCULTO | INACTIVO) o isPublic/privateLink
    if (eventData.eventType !== undefined) {
      const eventType = eventData.eventType;
      updateData.eventType = eventType;
      updateData.isPublic = eventType === 'PUBLICO';
      updateData.isActive = eventType !== 'INACTIVO';
      if (eventType === 'PRIVADO' || eventType === 'OCULTO') {
        if (!existingEvent.privateLink) {
          const { randomBytes } = await import('crypto');
          updateData.privateLink = randomBytes(8).toString('hex');
        }
      } else {
        updateData.privateLink = null;
      }
    } else if (eventData.isPublic !== undefined) {
      updateData.isPublic = eventData.isPublic;
      if (eventData.isPublic === false && !existingEvent.privateLink) {
        const { randomBytes } = await import('crypto');
        updateData.privateLink = randomBytes(8).toString('hex');
      } else if (eventData.isPublic === true) {
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

    // Día y hora de término del evento
    if (endDate && endTime) {
      const [ey, em, ed] = endDate.split('-');
      const [eh, emin] = endTime.split(':');
      updateData.endDate = new Date(`${ey}-${em}-${ed}T${eh}:${emin}:00`);
      updateData.endTime = endTime;
    } else if (endDate === null || endTime === null) {
      updateData.endDate = null;
      updateData.endTime = null;
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
    // Verificar si el evento existe y obtener información relevante
    const event = await prisma.event.findUnique({
      where: { id },
      select: { 
        date: true,
        organizerId: true,
      },
    });

    if (!event) {
      throw new Error('Evento no encontrado');
    }

    // Verificar permisos: si es organizador, solo puede eliminar sus propios eventos
    const user = await prisma.user.findUnique({ 
      where: { id: userId }, 
      select: { role: true } 
    });
    const isOrganizer = user?.role === 'ORGANIZER';
    
    if (isOrganizer && event.organizerId !== userId) {
      throw new Error('No autorizado para eliminar este evento');
    }

    // Verificar si hay órdenes asociadas al evento
    const ordersCount = await prisma.order.count({
      where: { eventId: id },
    });

    if (ordersCount > 0) {
      throw new Error('No se puede eliminar un evento que tiene órdenes asociadas. Solo se puede desactivar.');
    }

    // Verificar si el evento ya pasó
    const now = new Date();
    if (event.date < now) {
      throw new Error('No se puede borrar un evento que ya pasó. Solo se puede desactivar.');
    }

    // Si el evento no ha pasado y no tiene órdenes, se puede borrar físicamente
    return prisma.event.delete({
      where: { id },
    });
  }

  /** Crear un tipo de entrada (eTicket) para el evento. Crea Tanda "Venta general" si no existe. */
  async createTicketType(eventId: string, data: any, userId: string) {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { tandas: { orderBy: { startDate: 'asc' } }, ticketTypes: true },
    });
    if (!event) throw new Error('Evento no encontrado');
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (user?.role === 'ORGANIZER' && event.organizerId !== userId) throw new Error('No autorizado');

    const quantity = Math.max(0, parseInt(String(data.quantity ?? data.totalQty ?? 1), 10) || 1);
    const price = parseFloat(String(data.price ?? 0)) || 0;

    let tanda = event.tandas[0];
    if (!tanda) {
      const now = new Date();
      const eventDate = new Date(event.date);
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      const end = new Date(eventDate);
      end.setHours(23, 59, 59, 999);
      if (end < start) end.setTime(start.getTime() + 30 * 24 * 60 * 60 * 1000);
      tanda = await prisma.tanda.create({
        data: {
          eventId,
          name: 'Venta general',
          startDate: start,
          endDate: end,
          isActive: true,
        },
      });
    }

    const saleEndDate = data.saleEndDate && data.saleEndTime
      ? (() => {
          const d = String(data.saleEndDate).split('T')[0].split('-');
          const t = String(data.saleEndTime).split(':');
          return new Date(`${d[0]}-${d[1]}-${d[2]}T${t[0] || '00'}:${t[1] || '00'}:00`);
        })()
      : null;

    const validUntil = data.validUntil && data.validUntilTime
      ? (() => {
          const d = String(data.validUntil).split('T')[0].split('-');
          const t = String(data.validUntilTime).split(':');
          return new Date(`${d[0]}-${d[1]}-${d[2]}T${t[0] || '00'}:${t[1] || '00'}:00`);
        })()
      : null;

    const ticketType = await prisma.ticketType.create({
      data: {
        eventId,
        name: data.name || 'Entrada',
        description: data.description || null,
        totalQty: quantity,
        availableQty: quantity,
        status: data.status || 'Activo',
        ticketKind: data.ticketKind || 'Presencial',
        image: data.image || null,
        saleEndDate,
        saleEndTime: data.saleEndTime || null,
        validUntil,
        validUntilTime: data.validUntilTime || null,
      },
    });

    await prisma.tandaTicketType.create({
      data: {
        tandaId: tanda.id,
        ticketTypeId: ticketType.id,
        price,
        quantity,
        availableQty: quantity,
      },
    });

    return prisma.ticketType.findUnique({
      where: { id: ticketType.id },
      include: { tandaTicketTypes: { include: { tanda: true } } },
    });
  }

  /** Actualizar un tipo de entrada (eTicket). */
  async updateTicketType(eventId: string, ticketTypeId: string, data: any, userId: string) {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { ticketTypes: true },
    });
    if (!event) throw new Error('Evento no encontrado');
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (user?.role === 'ORGANIZER' && event.organizerId !== userId) throw new Error('No autorizado');

    const tt = event.ticketTypes.find((t) => t.id === ticketTypeId);
    if (!tt) throw new Error('Tipo de entrada no encontrado');

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.ticketKind !== undefined) updateData.ticketKind = data.ticketKind;
    if (data.image !== undefined) updateData.image = data.image;
    if (data.saleEndDate !== undefined) updateData.saleEndDate = data.saleEndDate ? new Date(data.saleEndDate) : null;
    if (data.saleEndTime !== undefined) updateData.saleEndTime = data.saleEndTime;
    if (data.validUntil !== undefined) updateData.validUntil = data.validUntil ? new Date(data.validUntil) : null;
    if (data.validUntilTime !== undefined) updateData.validUntilTime = data.validUntilTime;

    if (data.quantity !== undefined || data.totalQty !== undefined) {
      const q = Math.max(0, parseInt(String(data.quantity ?? data.totalQty ?? tt.totalQty), 10) || 0);
      const alreadySold = tt.soldQty || 0;
      updateData.totalQty = q;
      updateData.availableQty = Math.max(0, q - alreadySold);
    }

    await prisma.ticketType.update({
      where: { id: ticketTypeId },
      data: updateData,
    });

    if (data.price !== undefined) {
      const price = parseFloat(String(data.price)) || 0;
      const ttt = await prisma.tandaTicketType.findFirst({
        where: { ticketTypeId },
      });
      if (ttt) {
        await prisma.tandaTicketType.update({
          where: { id: ttt.id },
          data: { price },
        });
      }
    }

    return prisma.ticketType.findUnique({
      where: { id: ticketTypeId },
      include: { tandaTicketTypes: { include: { tanda: true } } },
    });
  }

  async getUsers(query: any) {
    const where: any = {};
    const andConditions: any[] = [];
    
    // Filtrar por rol si se especifica
    if (query.role && query.role !== 'all') {
      where.role = query.role;
    }

    // Filtrar por búsqueda si se especifica
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { dni: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    // Filtrar por organizador si se especifica (para ver solo sus vendedores/porteros)
    if (query.assignedBy) {
      const assignedByConditions: any[] = [
        { vendedorProfile: { assignedBy: query.assignedBy } },
        { porteroProfile: { assignedBy: query.assignedBy } }
      ];
      
      // Si hay filtro por rol o búsqueda, combinarlo con el filtro de assignedBy
      if (where.role || where.OR) {
        if (where.role) {
          andConditions.push({ role: where.role });
        }
        if (where.OR) {
          andConditions.push({ OR: where.OR });
        }
        andConditions.push({ OR: assignedByConditions });
        where.AND = andConditions;
        delete where.role;
        delete where.OR;
      } else {
        // Solo filtro por assignedBy
        where.OR = assignedByConditions;
      }
    }

    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '20', 10);
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
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
      }),
      prisma.user.count({ where }),
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getAllUsersForExport() {
    return prisma.user.findMany({
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
            validations: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async deleteUser(userId: string, assignedBy: string) {
    // Verificar que el usuario fue creado por el admin/organizador actual
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        vendedorProfile: true,
        porteroProfile: true,
      },
    });

    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    // Verificar que el usuario fue asignado por el admin/organizador actual
    const isAssignedBy = 
      (user.vendedorProfile && user.vendedorProfile.assignedBy === assignedBy) ||
      (user.porteroProfile && user.porteroProfile.assignedBy === assignedBy);

    if (!isAssignedBy) {
      throw new Error('No tienes permisos para eliminar este usuario. Solo puedes eliminar usuarios que creaste.');
    }

    // No permitir eliminar usuarios ADMIN u ORGANIZER
    if (user.role === 'ADMIN' || user.role === 'ORGANIZER') {
      throw new Error('No se pueden eliminar usuarios ADMIN u ORGANIZER');
    }

    // Eliminar el usuario (cascada eliminará los perfiles relacionados)
    return prisma.user.delete({
      where: { id: userId },
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
    // Verificar primero si el evento existe
    const eventExists = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true },
    });

    if (!eventExists) {
      return {
        event: null,
        ticketsSold: 0,
        ticketsScanned: 0,
        revenue: 0,
      };
    }

    const [event, ticketsSold, ticketsScanned, revenue] = await Promise.all([
      prisma.event.findUnique({
        where: { id: eventId },
        include: {
          organizer: {
            select: { id: true, name: true, email: true },
          },
          ticketTypes: {
            select: {
              id: true,
              name: true,
              totalQty: true,
              soldQty: true,
              availableQty: true,
            },
          },
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

  /** Promotores RRPP asignados a un evento (para Links RRPP) */
  async getEventPromotores(eventId: string, userId: string) {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, title: true, date: true, authorizationCode: true, organizerId: true },
    });
    if (!event) throw new Error('Evento no encontrado');
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (user?.role === 'ORGANIZER' && event.organizerId !== userId) throw new Error('No autorizado');

    const vendedorEvents = await prisma.vendedorEvent.findMany({
      where: { eventId },
      include: {
        vendedor: {
          include: {
            user: { select: { id: true, name: true, email: true, phone: true } },
          },
        },
      },
    });

    const referidos = await prisma.referido.findMany({
      where: { eventId },
      select: { vendedorId: true, customCode: true, customUrl: true, conversionCount: true, clickCount: true },
    });
    const referidoByVendedor = Object.fromEntries(referidos.map((r) => [r.vendedorId, r]));

    const ordersByVendedor = await prisma.order.groupBy({
      by: ['vendedorId'],
      where: { eventId, paymentStatus: 'COMPLETED' },
      _count: { id: true },
      _sum: { totalAmount: true },
    });
    const ordersByV = Object.fromEntries(ordersByVendedor.map((o) => [o.vendedorId || '', o]));

    const promotores = vendedorEvents.map((ve) => {
      const ref = referidoByVendedor[ve.vendedorId];
      const orders = ordersByV[ve.vendedorId];
      return {
        vendedorEventId: ve.id,
        vendedorId: ve.vendedorId,
        name: ve.vendedor.user.name,
        email: ve.vendedor.user.email,
        phone: ve.vendedor.user.phone,
        isActive: ve.vendedor.isActive,
        soldQty: ve.soldQty,
        ticketLimit: ve.ticketLimit,
        linkVenta: ref ? { customCode: ref.customCode, customUrl: ref.customUrl } : null,
        cortesia: 0,
        invitaciones: 0,
        conversionCount: ref?.conversionCount ?? 0,
        clickCount: ref?.clickCount ?? 0,
      };
    });

    return { event, promotores };
  }

  /** Bases de datos de cortesías por evento */
  async getCortesiaBases(eventId: string, userId: string) {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, organizerId: true },
    });
    if (!event) throw new Error('Evento no encontrado');
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (user?.role === 'ORGANIZER' && event.organizerId !== userId) throw new Error('No autorizado');

    const bases = await prisma.eventCortesiaBase.findMany({
      where: { eventId },
      orderBy: { createdAt: 'desc' },
    });
    return bases.map((b) => ({
      id: b.id,
      name: b.name,
      quantity: Array.isArray(b.rows) ? (b.rows as any[]).length : 0,
      createdAt: b.createdAt,
    }));
  }

  async createCortesiaBase(eventId: string, userId: string, data: { name: string; rows: { name: string; email: string }[] }) {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, organizerId: true },
    });
    if (!event) throw new Error('Evento no encontrado');
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (user?.role === 'ORGANIZER' && event.organizerId !== userId) throw new Error('No autorizado');

    const normalized = data.rows
      .map((r) => ({ name: String(r.name || '').trim(), email: String(r.email || '').trim().toLowerCase() }))
      .filter((r) => r.email);
    return prisma.eventCortesiaBase.create({
      data: { eventId, name: data.name.trim() || 'Sin nombre', rows: normalized as any },
    });
  }

  async getCortesiaBase(baseId: string, userId: string) {
    const base = await prisma.eventCortesiaBase.findUnique({
      where: { id: baseId },
      include: { event: { select: { id: true, organizerId: true } } },
    });
    if (!base) throw new Error('Base no encontrada');
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (user?.role === 'ORGANIZER' && base.event.organizerId !== userId) throw new Error('No autorizado');
    return base;
  }

  async deleteCortesiaBase(baseId: string, userId: string) {
    await this.getCortesiaBase(baseId, userId);
    await prisma.eventCortesiaBase.delete({ where: { id: baseId } });
  }

  /**
   * Detalles de ventas eTickets: lista de tickets (vendidos + cortesías) con filtros y resumen.
   * Solo tickets de órdenes COMPLETED. RRPP = vendedor de la orden o "-". Estado = Vigente (ACTIVE) o Validada (USED) con fecha de escaneo.
   */
  async getEventSalesDetails(
    eventId: string,
    userId: string,
    filters: { rrpp?: string; tipo?: string; estado?: string; email?: string } = {}
  ) {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, organizerId: true },
    });
    if (!event) throw new Error('Evento no encontrado');
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (user?.role === 'ORGANIZER' && event.organizerId !== userId) throw new Error('No autorizado');

    const where: any = {
      eventId,
      order: { paymentStatus: 'COMPLETED' },
    };
    if (filters.rrpp) where.order.vendedorId = filters.rrpp;
    if (filters.tipo) where.ticketTypeId = filters.tipo;
    if (filters.estado === 'Vigente') where.status = 'ACTIVE';
    if (filters.estado === 'Validada') where.status = 'USED';
    if (filters.email?.trim()) {
      where.owner = { email: { contains: filters.email.trim(), mode: 'insensitive' } };
    }

    const tickets = await prisma.ticket.findMany({
      where,
      include: {
        owner: { select: { id: true, name: true, email: true, phone: true } },
        ticketType: { select: { id: true, name: true } },
        order: {
          select: {
            id: true,
            totalAmount: true,
            paymentMethod: true,
            vendedorId: true,
            vendedor: { include: { user: { select: { name: true } } } },
          },
        },
      },
      orderBy: { purchaseDate: 'desc' },
    });

    const rows = tickets.map((t) => {
      const orderTicketsCount = 1; // we need count per order - will fix below
      const orderTotal = Number((t.order as any).totalAmount ?? 0);
      const pricePerTicket = orderTotal; // will recompute with real count
      return {
        id: t.id,
        nombre: (t.owner as any).name,
        email: (t.owner as any).email,
        telefono: (t.owner as any).phone ?? '-',
        fechaAdquisicion: t.purchaseDate,
        tipo: (t.ticketType as any).name,
        rrpp: (t.order as any).vendedor?.user?.name ?? '-',
        vendedorId: (t.order as any).vendedorId ?? null,
        estado: t.status === 'USED' ? 'Validada' : 'Vigente',
        fechaEntrada: t.scannedAt ?? null,
        formaPago: (t.order as any).paymentMethod === 'MERCADOPAGO' ? 'Mercado Pago' : (t.order as any).paymentMethod === 'CASH' ? 'Efectivo' : (t.order as any).paymentMethod ?? 'Venta',
        precio: orderTotal,
        orderId: (t.order as any).id,
      };
    });

    const orderIds = [...new Set(rows.map((r) => r.orderId))];
    const counts = await prisma.ticket.groupBy({
      by: ['orderId'],
      where: { orderId: { in: orderIds } },
      _count: { id: true },
    });
    const countByOrder = Object.fromEntries(counts.map((c) => [c.orderId, c._count.id]));

    const rowsWithPrice = rows.map((r) => {
      const n = countByOrder[r.orderId] || 1;
      const orderTotal = r.precio;
      const ticketsInOrder = n;
      const pricePerTicket = ticketsInOrder > 0 ? orderTotal / ticketsInOrder : orderTotal;
      return {
        ...r,
        precio: pricePerTicket,
      };
    });

    const allTicketsForSummary = await prisma.ticket.findMany({
      where: { eventId, order: { paymentStatus: 'COMPLETED' } },
      include: { order: { select: { totalAmount: true, paymentStatus: true } } },
    });
    const totalTickets = allTicketsForSummary.length;
    const ordersByTotal = await prisma.order.findMany({
      where: { eventId, paymentStatus: 'COMPLETED' },
      select: { id: true, totalAmount: true },
    });
    const totalVendidas = allTicketsForSummary.filter((t) => Number((t.order as any).totalAmount ?? 0) > 0).length;
    const totalCortesias = allTicketsForSummary.filter((t) => Number((t.order as any).totalAmount ?? 0) === 0).length;
    const subtotal = ordersByTotal.reduce((s, o) => s + Number(o.totalAmount ?? 0), 0);
    const refunded = await prisma.order.aggregate({
      where: { eventId, paymentStatus: 'REFUNDED' },
      _sum: { totalAmount: true },
    });
    const solicitudesDevolucion = Number(refunded._sum.totalAmount ?? 0);
    const ticketsEmitidosValidos = await prisma.ticket.count({
      where: { eventId, status: { in: ['ACTIVE', 'USED'] } },
    });

    const promotores = await prisma.vendedorEvent.findMany({
      where: { eventId },
      include: { vendedor: { include: { user: { select: { id: true, name: true } } } } },
    });

    return {
      tickets: rowsWithPrice.map(({ orderId, ...r }) => r),
      summary: {
        totalTickets,
        totalVendidas,
        totalCortesias,
        subtotal,
        solicitudesDevolucion,
        total: subtotal - solicitudesDevolucion,
        ticketsEmitidosValidos,
      },
      promotores: promotores.map((pe) => ({ id: pe.vendedorId, name: (pe.vendedor as any).user?.name })),
      ticketTypes: await prisma.ticketType.findMany({ where: { eventId }, select: { id: true, name: true } }),
      event: { id: event.id },
    };
  }

  /** Porteros (acreditadores) asignados a un evento */
  async getEventPorteros(eventId: string, userId: string) {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, organizerId: true },
    });
    if (!event) throw new Error('Evento no encontrado');
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (user?.role === 'ORGANIZER' && event.organizerId !== userId) throw new Error('No autorizado');

    const porterosEvents = await prisma.porteroEvent.findMany({
      where: { eventId },
      include: {
        portero: {
          include: {
            user: { select: { id: true, name: true, email: true, phone: true } },
          },
        },
      },
    });

    const validatorIds = porterosEvents.map((pe) => (pe.portero as any).user.id);
    const counts = await prisma.ticketValidation.groupBy({
      by: ['validatorId'],
      where: {
        validatorId: { in: validatorIds },
        ticket: { eventId },
      },
      _count: { id: true },
    });
    const countByValidator = Object.fromEntries(counts.map((c) => [c.validatorId, c._count.id]));

    return porterosEvents.map((pe) => {
      const p = pe.portero as any;
      const u = p.user;
      return {
        id: p.id,
        userId: p.userId,
        nombre: u?.name,
        usuario: u?.email,
        email: u?.email,
        telefono: u?.phone ?? '-',
        initialPassword: p.initialPassword ?? null,
        acreditacionesCount: countByValidator[u?.id] ?? 0,
      };
    });
  }

  async getPorteroResumenForEvent(eventId: string, porteroId: string, userId: string) {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, organizerId: true },
    });
    if (!event) throw new Error('Evento no encontrado');
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (user?.role === 'ORGANIZER' && event.organizerId !== userId) throw new Error('No autorizado');

    const porteroEvent = await prisma.porteroEvent.findUnique({
      where: { porteroId_eventId: { porteroId, eventId } },
    });
    if (!porteroEvent) throw new Error('El portero no está asignado a este evento');

    const portero = await prisma.portero.findUnique({
      where: { id: porteroId },
      select: { userId: true },
    });
    if (!portero) throw new Error('Portero no encontrado');

    const validations = await prisma.ticketValidation.findMany({
      where: {
        validatorId: portero.userId,
        ticket: { eventId },
      },
      include: {
        ticket: {
          include: {
            owner: { select: { name: true, email: true } },
          },
        },
      },
      orderBy: { scannedAt: 'desc' },
      take: 500,
    });

    return validations.map((v) => ({
      id: v.id,
      scannedAt: v.scannedAt,
      isValid: v.isValid,
      ticketOwner: (v.ticket as any).owner?.name,
      ticketEmail: (v.ticket as any).owner?.email,
    }));
  }

  /** Resumen de acreditación: por tipo de ticket, validados / restante / total */
  async getEventAccreditationSummary(eventId: string, userId: string) {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, title: true, organizerId: true },
    });
    if (!event) throw new Error('Evento no encontrado');
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (user?.role === 'ORGANIZER' && event.organizerId !== userId) throw new Error('No autorizado');

    const ticketTypes = await prisma.ticketType.findMany({
      where: { eventId },
      select: { id: true, name: true },
    });

    const eTickets: { tipo: string; validados: number; restante: number; total: number }[] = [];
    let totalValidados = 0;
    let totalRestante = 0;
    let totalTotal = 0;

    for (const tt of ticketTypes) {
      const [total, used] = await Promise.all([
        prisma.ticket.count({ where: { eventId, ticketTypeId: tt.id } }),
        prisma.ticket.count({ where: { eventId, ticketTypeId: tt.id, status: 'USED' } }),
      ]);
      const validados = used;
      const restante = total - used;
      eTickets.push({
        tipo: tt.name,
        validados,
        restante,
        total,
      });
      totalValidados += validados;
      totalRestante += restante;
      totalTotal += total;
    }

    return {
      event: { id: event.id, title: event.title },
      eTickets,
      totalETickets: { validados: totalValidados, restante: totalRestante, total: totalTotal },
      consumos: [],
      totalConsumos: { validados: 0, restante: 0, total: 0 },
      ticketsFisicos: [],
      totalTicketsFisicos: { validados: 0, restante: 0, total: 0 },
    };
  }
}

