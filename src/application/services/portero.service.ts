import { PorteroRepository } from '../../infrastructure/repositories/PorteroRepository';
import { UserRepository } from '../../infrastructure/repositories/UserRepository';
import { PasswordService } from '../../infrastructure/services/password.service';
import { AppError } from '../../infrastructure/middleware/error.middleware';
import { prisma } from '../../infrastructure/database/prisma';
import { QRService } from '../../infrastructure/services/qr.service';

export class PorteroService {
  private porteroRepository: PorteroRepository;
  private userRepository: UserRepository;
  private passwordService: PasswordService;

  constructor() {
    this.porteroRepository = new PorteroRepository();
    this.userRepository = new UserRepository();
    this.passwordService = new PasswordService();
  }

  async createPortero(data: {
    email: string;
    password: string;
    name: string;
    dni: string;
    phone?: string;
  }, assignedBy: string) {
    // Verificar que el usuario asignador es organizador o admin
    const assigner = await this.userRepository.findById(assignedBy);
    if (!assigner || (assigner.role !== 'ORGANIZER' && assigner.role !== 'ADMIN')) {
      throw new AppError('Solo organizadores y administradores pueden crear porteros', 403, 'FORBIDDEN');
    }

    // Verificar si el usuario ya existe
    const existingUser = await this.userRepository.findByEmail(data.email);
    
    if (existingUser) {
      // Si el usuario ya existe, verificar si ya es portero
      const existingPortero = await this.porteroRepository.findByUserId(existingUser.id);
      if (existingPortero) {
        throw new AppError('Este usuario ya es un portero', 409, 'ALREADY_PORTERO');
      }

      // Si el usuario existe pero no es portero, convertirlo
      // Actualizar el rol del usuario
      await prisma.user.update({
        where: { id: existingUser.id },
        data: { role: 'PORTERO' },
      });

      // Crear perfil de portero
      const portero = await this.porteroRepository.create({
        userId: existingUser.id,
        assignedBy,
      });

      return portero;
    }

    // Verificar DNI solo si el usuario no existe
    const existingDni = await this.userRepository.findByDni(data.dni);
    if (existingDni && existingDni.email !== data.email) {
      throw new AppError('El DNI ya está registrado', 409, 'DNI_EXISTS');
    }

    // Hash de contraseña antes de crear el usuario
    const hashedPassword = await this.passwordService.hash(data.password);

    // Crear nuevo usuario con rol PORTERO
    const user = await this.userRepository.create({
      ...data,
      password: hashedPassword,
      role: 'PORTERO',
    });

    // Crear perfil de portero
    const portero = await this.porteroRepository.create({
      userId: user.id,
      assignedBy,
    });

    return portero;
  }

  async scanTicket(qrCode: string, porteroId: string) {
    // Verificar que el portero existe
    const portero = await this.porteroRepository.findById(porteroId);
    if (!portero) {
      throw new AppError('Portero no encontrado', 404, 'PORTERO_NOT_FOUND');
    }

    // Validar el QR code
    const validation = QRService.validateQRCode(qrCode);
    if (!validation.valid || !validation.data) {
      return {
        isValid: false,
        reason: 'Código QR inválido',
      };
    }

    const { ticketId } = validation.data;

    // Buscar el ticket
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
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
    });

    if (!ticket) {
      return {
        isValid: false,
        reason: 'Entrada no encontrada',
      };
    }

    // Verificar si ya fue usada
    if (ticket.status === 'USED') {
      return {
        isValid: false,
        reason: 'Esta entrada ya fue utilizada',
        ticket: {
          id: ticket.id,
          event: ticket.event,
          owner: ticket.owner,
          scannedAt: ticket.scannedAt,
        },
      };
    }

    // Verificar si está expirada
    if (ticket.status === 'EXPIRED' || new Date(ticket.expiresAt) < new Date()) {
      return {
        isValid: false,
        reason: 'Esta entrada ha expirado',
        ticket: {
          id: ticket.id,
          event: ticket.event,
          owner: ticket.owner,
        },
      };
    }

    // Verificar si está cancelada
    if (ticket.status === 'CANCELLED') {
      return {
        isValid: false,
        reason: 'Esta entrada fue cancelada',
        ticket: {
          id: ticket.id,
          event: ticket.event,
          owner: ticket.owner,
        },
      };
    }

    // Verificar si está pendiente de pago
    if (ticket.status === 'PENDING_PAYMENT') {
      return {
        isValid: false,
        reason: 'Esta entrada está pendiente de pago',
        ticket: {
          id: ticket.id,
          event: ticket.event,
          owner: ticket.owner,
        },
      };
    }

    // Todo está bien, marcar como usada y registrar el escaneo
    try {
      await prisma.$transaction([
        // Actualizar el ticket a USED
        prisma.ticket.update({
          where: { id: ticket.id },
          data: {
            status: 'USED',
            scannedAt: new Date(),
          },
        }),
        // Registrar la validación
        prisma.ticketValidation.create({
          data: {
            ticketId: ticket.id,
            validatorId: portero.userId,
            isValid: true,
          },
        }),
      ]);

      return {
        isValid: true,
        ticket: {
          id: ticket.id,
          event: ticket.event,
          owner: ticket.owner,
          scannedAt: new Date(),
        },
      };
    } catch (error: any) {
      throw new AppError('Error al procesar el escaneo', 500, 'SCAN_ERROR');
    }
  }

  async getAllPorteros(assignedBy?: string) {
    return this.porteroRepository.getAllPorteros(assignedBy);
  }

  async getScanHistory(porteroId: string, limit: number = 50) {
    return this.porteroRepository.getScanHistory(porteroId, limit);
  }
}

