import { VendedorRepository } from '../../infrastructure/repositories/VendedorRepository';
import { ReferidoRepository } from '../../infrastructure/repositories/ReferidoRepository';
import { UserRepository } from '../../infrastructure/repositories/UserRepository';
import { PasswordService } from '../../infrastructure/services/password.service';
import { AppError } from '../../infrastructure/middleware/error.middleware';
import { prisma } from '../../infrastructure/database/prisma';
import { config } from '../../infrastructure/config';

export class VendedorService {
  private vendedorRepository: VendedorRepository;
  private referidoRepository: ReferidoRepository;
  private userRepository: UserRepository;
  private passwordService: PasswordService;

  constructor() {
    this.vendedorRepository = new VendedorRepository();
    this.referidoRepository = new ReferidoRepository();
    this.userRepository = new UserRepository();
    this.passwordService = new PasswordService();
  }

  async createVendedor(data: {
    email: string;
    password: string;
    name: string;
    dni: string;
    phone: string;
    commissionPercent: number;
  }, assignedBy: string) {
    // Verificar que el usuario asignador es organizador o admin
    const assigner = await this.userRepository.findById(assignedBy);
    if (!assigner || (assigner.role !== 'ORGANIZER' && assigner.role !== 'ADMIN')) {
      throw new AppError('Solo organizadores y administradores pueden crear vendedores', 403, 'FORBIDDEN');
    }

    // Verificar si el usuario ya existe
    const existingUser = await this.userRepository.findByEmail(data.email);
    
    if (existingUser) {
      // Si el usuario ya existe, verificar si ya es vendedor
      const existingVendedor = await this.vendedorRepository.findByUserId(existingUser.id);
      if (existingVendedor) {
        throw new AppError('Este usuario ya es un vendedor', 409, 'ALREADY_VENDEDOR');
      }

      // Si el usuario existe pero no es vendedor, convertirlo
      // Actualizar el rol del usuario
      await prisma.user.update({
        where: { id: existingUser.id },
        data: { role: 'VENDEDOR' },
      });

      // Crear perfil de vendedor
      const vendedor = await this.vendedorRepository.create({
        userId: existingUser.id,
        assignedBy,
        commissionPercent: data.commissionPercent,
      });

      // Asignar automáticamente todos los eventos activos del organizador/admin
      // Si es ADMIN, asignar todos los eventos activos (futuros y pasados)
      // Si es ORGANIZER, solo asignar sus eventos activos
      // assigner ya está declarado al inicio de la función
      const isAdmin = assigner?.role === 'ADMIN';
      
      const activeEvents = await prisma.event.findMany({
        where: {
          ...(isAdmin ? {} : { organizerId: assignedBy }), // ADMIN puede asignar todos los eventos
          isActive: true,
          // Incluir eventos futuros y pasados (no filtrar por fecha)
        },
        select: {
          id: true,
        },
      });

      // Asignar cada evento al vendedor (evitar duplicados)
      if (activeEvents.length > 0) {
        for (const event of activeEvents) {
          try {
            await this.vendedorRepository.assignEvent(vendedor.id, event.id);
            // Crear referido automáticamente para el evento asignado
            try {
              await this.createReferidoForEvent(vendedor.id, event.id);
            } catch (refError: any) {
              // Si el referido ya existe, ignorar el error
              if (!refError.message?.includes('ya existe')) {
                console.error(`Error al crear referido para evento ${event.id}:`, refError);
              }
            }
          } catch (error: any) {
            // Si el evento ya está asignado, ignorar el error y continuar
            if (error.code !== 'P2002' && !error.message?.includes('ya está asignado')) {
              console.error(`Error al asignar evento ${event.id} al vendedor ${vendedor.id}:`, error);
            }
          }
        }
      }

      return vendedor;
    }

    // Verificar DNI solo si el usuario no existe
    const existingDni = await this.userRepository.findByDni(data.dni);
    if (existingDni && existingDni.email !== data.email) {
      throw new AppError('El DNI ya está registrado', 409, 'DNI_EXISTS');
    }

    // Hash de contraseña antes de crear el usuario
    const hashedPassword = await this.passwordService.hash(data.password);

    // Crear nuevo usuario con rol VENDEDOR
    const user = await this.userRepository.create({
      ...data,
      password: hashedPassword,
      role: 'VENDEDOR',
    });

    // Crear perfil de vendedor
    const vendedor = await this.vendedorRepository.create({
      userId: user.id,
      assignedBy,
      commissionPercent: data.commissionPercent,
    });

    // Asignar automáticamente todos los eventos activos del organizador/admin
    // Si es ADMIN, asignar todos los eventos activos (futuros y pasados)
    // Si es ORGANIZER, solo asignar sus eventos activos
    // assigner ya está declarado al inicio de la función
    const isAdmin = assigner?.role === 'ADMIN';
    
    const activeEvents = await prisma.event.findMany({
      where: {
        ...(isAdmin ? {} : { organizerId: assignedBy }), // ADMIN puede asignar todos los eventos
        isActive: true,
        // Incluir eventos futuros y pasados (no filtrar por fecha)
      },
      select: {
        id: true,
      },
    });

    // Asignar cada evento al vendedor (evitar duplicados)
    if (activeEvents.length > 0) {
      for (const event of activeEvents) {
        try {
          await this.vendedorRepository.assignEvent(vendedor.id, event.id);
          // Crear referido automáticamente para el evento asignado
          try {
            await this.createReferidoForEvent(vendedor.id, event.id);
          } catch (refError: any) {
            // Si el referido ya existe, ignorar el error
            if (!refError.message?.includes('ya existe')) {
              console.error(`Error al crear referido para evento ${event.id}:`, refError);
            }
          }
        } catch (error: any) {
          // Si el evento ya está asignado, ignorar el error y continuar
          if (error.code !== 'P2002' && !error.message?.includes('ya está asignado')) {
            console.error(`Error al asignar evento ${event.id} al vendedor ${vendedor.id}:`, error);
          }
        }
      }
    }

    return vendedor;
  }

  async assignEvent(vendedorId: string, eventId: string, ticketLimit?: number, assignedBy?: string) {
    // Verificar que el vendedor existe
    const vendedor = await this.vendedorRepository.findById(vendedorId);
    if (!vendedor) {
      throw new AppError('Vendedor no encontrado', 404, 'VENDEDOR_NOT_FOUND');
    }

    // Verificar permisos si se proporciona assignedBy
    if (assignedBy) {
      const assigner = await this.userRepository.findById(assignedBy);
      if (!assigner || (assigner.role !== 'ORGANIZER' && assigner.role !== 'ADMIN')) {
        throw new AppError('No autorizado', 403, 'FORBIDDEN');
      }

      // Verificar que el evento pertenece al organizador o es admin
      const event = await prisma.event.findUnique({
        where: { id: eventId },
      });

      if (!event) {
        throw new AppError('Evento no encontrado', 404, 'EVENT_NOT_FOUND');
      }

      if (assigner.role !== 'ADMIN' && event.organizerId !== assignedBy) {
        throw new AppError('No tienes permiso para asignar este evento', 403, 'FORBIDDEN');
      }
    }

    // Verificar que no esté ya asignado
    const existing = await prisma.vendedorEvent.findUnique({
      where: {
        vendedorId_eventId: {
          vendedorId,
          eventId,
        },
      },
    });

    if (existing) {
      throw new AppError('El evento ya está asignado a este vendedor', 409, 'ALREADY_ASSIGNED');
    }

    const result = await this.vendedorRepository.assignEvent(vendedorId, eventId, ticketLimit);
    
    // Crear referido automáticamente para el evento asignado
    try {
      await this.createReferidoForEvent(vendedorId, eventId);
    } catch (refError: any) {
      // Si el referido ya existe, ignorar el error
      if (!refError.message?.includes('ya existe')) {
        console.error(`Error al crear referido para evento ${eventId}:`, refError);
      }
    }

    return result;
  }

  async getVendedorDashboard(vendedorId: string) {
    // vendedorId es el ID del vendedor (de la tabla Vendedor), no el userId
    const vendedor = await this.vendedorRepository.findById(vendedorId);
    if (!vendedor) {
      throw new AppError('Vendedor no encontrado', 404, 'VENDEDOR_NOT_FOUND');
    }

    // Obtener eventos asignados
    let events = await this.vendedorRepository.getVendedorEvents(vendedor.id);
    
    // Si el vendedor no tiene eventos asignados, intentar sincronizar automáticamente
    if (events.length === 0) {
      try {
        await this.syncVendedorEvents(vendedor.id);
        // Volver a obtener eventos después de la sincronización
        events = await this.vendedorRepository.getVendedorEvents(vendedor.id);
      } catch (error) {
        console.error('Error al sincronizar eventos del vendedor:', error);
        // Continuar aunque falle la sincronización
      }
    }

    // Sincronizar referidos para eventos asignados que no tienen link
    try {
      await this.syncReferidos(vendedor.id);
    } catch (error) {
      console.error('Error al sincronizar referidos del vendedor:', error);
      // Continuar aunque falle la sincronización
    }

    const metrics = await this.vendedorRepository.getVendedorMetrics(vendedor.id);
    const referidos = await this.referidoRepository.findByVendedorId(vendedor.id);

    return {
      vendedor: {
        id: vendedor.id,
        userId: vendedor.userId,
        commissionPercent: Number(vendedor.commissionPercent),
        totalEarnings: Number(vendedor.totalEarnings),
        user: vendedor.user,
      },
      metrics: metrics?.metrics || {
        totalSales: 0,
        totalRevenue: 0,
        totalEarnings: 0,
        totalTicketsSold: 0,
        salesByEvent: [],
      },
      events,
      referidos,
    };
  }

  // Función helper para crear referido automáticamente
  private async createReferidoForEvent(vendedorId: string, eventId: string) {
    // Verificar si ya existe un referido para este evento
    const existingReferido = await prisma.referido.findFirst({
      where: {
        vendedorId,
        eventId,
      },
    });

    if (existingReferido) {
      return existingReferido; // Ya existe, retornar el existente
    }

    // Generar código automático
    const finalCode = `REF-${vendedorId.substring(0, 8)}-${eventId.substring(0, 8)}`;
    
    // Verificar que el código no existe, si existe generar uno único
    let codeToUse = finalCode;
    let codeExists = await prisma.referido.findUnique({
      where: { customCode: codeToUse },
    });

    // Si el código existe, generar uno único con timestamp
    if (codeExists) {
      codeToUse = `REF-${vendedorId.substring(0, 8)}-${eventId.substring(0, 8)}-${Date.now().toString(36)}`;
    }

    const baseUrl = config.frontendUrl || 'http://localhost:5173';
    const customUrl = `${baseUrl}/evento/${eventId}?ref=${codeToUse}`;

    return this.referidoRepository.create({
      vendedorId,
      eventId,
      customCode: codeToUse,
      customUrl,
    });
  }

  async createReferido(vendedorId: string, eventId: string, customCode?: string) {
    const vendedor = await this.vendedorRepository.findById(vendedorId);
    if (!vendedor) {
      throw new AppError('Vendedor no encontrado', 404, 'VENDEDOR_NOT_FOUND');
    }

    // Verificar que el evento está asignado al vendedor
    const vendedorEvent = await prisma.vendedorEvent.findUnique({
      where: {
        vendedorId_eventId: {
          vendedorId,
          eventId,
        },
      },
    });

    if (!vendedorEvent) {
      throw new AppError('El evento no está asignado a este vendedor', 403, 'EVENT_NOT_ASSIGNED');
    }

    // Verificar si ya existe un referido para este evento
    const existingReferido = await prisma.referido.findFirst({
      where: {
        vendedorId,
        eventId,
      },
    });

    if (existingReferido) {
      throw new AppError('Ya existe un link de referido para este evento', 409, 'REFERIDO_EXISTS');
    }

    // Generar código personalizado o usar el proporcionado
    const finalCode = customCode || `REF-${vendedorId.substring(0, 8)}-${eventId.substring(0, 8)}`;
    
    // Verificar que el código no existe
    const codeExists = await prisma.referido.findUnique({
      where: { customCode: finalCode },
    });

    if (codeExists) {
      throw new AppError('El código personalizado ya está en uso', 409, 'CODE_EXISTS');
    }

    const baseUrl = config.frontendUrl || 'http://localhost:5173';
    const customUrl = `${baseUrl}/evento/${eventId}?ref=${finalCode}`;

    return this.referidoRepository.create({
      vendedorId,
      eventId,
      customCode: finalCode,
      customUrl,
    });
  }

  async updateReferidoCode(referidoId: string, customCode: string, vendedorId: string) {
    const referido = await prisma.referido.findUnique({
      where: { id: referidoId },
    });

    if (!referido) {
      throw new AppError('Link de referido no encontrado', 404, 'REFERIDO_NOT_FOUND');
    }

    if (referido.vendedorId !== vendedorId) {
      throw new AppError('No autorizado', 403, 'FORBIDDEN');
    }

    // Verificar que el código no existe
    const codeExists = await prisma.referido.findUnique({
      where: { customCode },
    });

    if (codeExists && codeExists.id !== referidoId) {
      throw new AppError('El código personalizado ya está en uso', 409, 'CODE_EXISTS');
    }

    const baseUrl = config.frontendUrl || 'http://localhost:5173';
    const customUrl = `${baseUrl}/evento/${referido.eventId}?ref=${customCode}`;

    return this.referidoRepository.updateCustomCode(referidoId, customCode, customUrl);
  }

  async updateAllReferidoCodes(vendedorId: string, customCode: string) {
    const vendedor = await this.vendedorRepository.findById(vendedorId);
    if (!vendedor) {
      throw new AppError('Vendedor no encontrado', 404, 'VENDEDOR_NOT_FOUND');
    }

    // Verificar que el código no existe
    const codeExists = await prisma.referido.findUnique({
      where: { customCode },
    });

    if (codeExists && codeExists.vendedorId !== vendedorId) {
      throw new AppError('El código personalizado ya está en uso', 409, 'CODE_EXISTS');
    }

    const baseUrl = config.frontendUrl || 'http://localhost:5173';
    return this.referidoRepository.updateAllVendedorCodes(vendedorId, customCode, baseUrl);
  }

  async getAllVendedores(assignedBy?: string) {
    return this.vendedorRepository.getAllVendedores(assignedBy);
  }

  async getVendedorMetrics(vendedorId: string) {
    return this.vendedorRepository.getVendedorMetrics(vendedorId);
  }

  async syncVendedorEvents(vendedorId: string) {
    // Sincronizar eventos para un vendedor existente
    // Asignar todos los eventos activos del organizador/admin que lo creó
    const vendedor = await this.vendedorRepository.findById(vendedorId);
    if (!vendedor) {
      throw new AppError('Vendedor no encontrado', 404, 'VENDEDOR_NOT_FOUND');
    }

    const assigner = await this.userRepository.findById(vendedor.assignedBy);
    if (!assigner) {
      throw new AppError('Usuario asignador no encontrado', 404, 'ASSIGNER_NOT_FOUND');
    }

    const isAdmin = assigner.role === 'ADMIN';
    
    const activeEvents = await prisma.event.findMany({
      where: {
        ...(isAdmin ? {} : { organizerId: vendedor.assignedBy }),
        isActive: true,
      },
      select: {
        id: true,
      },
    });

    // Obtener eventos ya asignados
    const assignedEvents = await prisma.vendedorEvent.findMany({
      where: { vendedorId },
      select: { eventId: true },
    });
    const assignedEventIds = new Set(assignedEvents.map(ve => ve.eventId));

    // Asignar solo los eventos que no están asignados
    const eventsToAssign = activeEvents.filter(e => !assignedEventIds.has(e.id));
    
    if (eventsToAssign.length > 0) {
      for (const event of eventsToAssign) {
        try {
          await this.vendedorRepository.assignEvent(vendedor.id, event.id);
          // Crear referido automáticamente para el evento asignado
          try {
            await this.createReferidoForEvent(vendedor.id, event.id);
          } catch (refError: any) {
            // Si el referido ya existe, ignorar el error
            if (!refError.message?.includes('ya existe')) {
              console.error(`Error al crear referido para evento ${event.id}:`, refError);
            }
          }
        } catch (error: any) {
          console.error(`Error al asignar evento ${event.id} al vendedor ${vendedor.id}:`, error);
        }
      }
    }

    return {
      totalEvents: activeEvents.length,
      newlyAssigned: eventsToAssign.length,
      alreadyAssigned: assignedEvents.length,
    };
  }

  async syncReferidos(vendedorId: string) {
    // Sincronizar referidos para eventos asignados que no tienen link
    const vendedor = await this.vendedorRepository.findById(vendedorId);
    if (!vendedor) {
      throw new AppError('Vendedor no encontrado', 404, 'VENDEDOR_NOT_FOUND');
    }

    // Obtener todos los eventos asignados al vendedor
    const assignedEvents = await prisma.vendedorEvent.findMany({
      where: { vendedorId },
      select: { eventId: true },
    });

    // Obtener todos los referidos existentes
    const existingReferidos = await prisma.referido.findMany({
      where: { vendedorId },
      select: { eventId: true },
    });
    const existingEventIds = new Set(existingReferidos.map(r => r.eventId));

    // Crear referidos para eventos que no tienen link
    const eventsWithoutReferido = assignedEvents.filter(ve => !existingEventIds.has(ve.eventId));
    let created = 0;

    for (const ve of eventsWithoutReferido) {
      try {
        await this.createReferidoForEvent(vendedorId, ve.eventId);
        created++;
      } catch (error: any) {
        console.error(`Error al crear referido para evento ${ve.eventId}:`, error);
      }
    }

    return {
      totalAssignedEvents: assignedEvents.length,
      existingReferidos: existingReferidos.length,
      newlyCreated: created,
    };
  }
}

