import { AdminRepository } from '../../infrastructure/repositories/AdminRepository';
import { VendedorService } from './vendedor.service';
import { PorteroService } from './portero.service';
import { AccountingService } from './accounting.service';
import { AppError } from '../../infrastructure/middleware/error.middleware';
import { PrismaClient } from '@prisma/client';
import { PasswordService } from '../../infrastructure/services/password.service';
import { QRService } from '../../infrastructure/services/qr.service';
import { DateService } from '../../infrastructure/services/date.service';
import { redisClient } from '../../infrastructure/redis/client';
import { config } from '../../infrastructure/config';
import crypto from 'crypto';

const prisma = new PrismaClient();

export class AdminService {
  private adminRepository: AdminRepository;
  private vendedorService: VendedorService;
  private porteroService: PorteroService;

  constructor() {
    this.adminRepository = new AdminRepository();
    this.vendedorService = new VendedorService();
    this.porteroService = new PorteroService();
  }

  async getDashboard(userId: string) {
    return this.adminRepository.getDashboard(userId);
  }

  async getEventById(id: string, userId?: string) {
    const event = await this.adminRepository.getEventById(id, userId);
    if (!event) {
      throw new AppError('Evento no encontrado', 404, 'EVENT_NOT_FOUND');
    }
    return event;
  }

  async getEvents(query: any, userId?: string) {
    return this.adminRepository.getEvents(query, userId);
  }

  async createEvent(data: any, userId: string) {
    return this.adminRepository.createEvent(data, userId);
  }

  async updateEvent(id: string, data: any, userId: string) {
    return this.adminRepository.updateEvent(id, data, userId);
  }

  async deleteEvent(id: string, userId: string) {
    return this.adminRepository.deleteEvent(id, userId);
  }

  async getUsers(query: any) {
    return this.adminRepository.getUsers(query);
  }

  async getUserById(id: string) {
    return this.adminRepository.getUserById(id);
  }

  async deleteUser(userId: string, assignedBy: string) {
    return this.adminRepository.deleteUser(userId, assignedBy);
  }

  async updateUser(id: string, data: any) {
    return this.adminRepository.updateUser(id, data);
  }

  async blockUser(id: string) {
    return this.adminRepository.blockUser(id);
  }

  async getEventStats(eventId: string) {
    const stats = await this.adminRepository.getEventStats(eventId);
    if (!stats || !stats.event) {
      throw new AppError('Evento no encontrado', 404, 'EVENT_NOT_FOUND');
    }
    return stats;
  }

  async createVendedor(data: {
    email: string;
    password: string;
    name: string;
    dni: string;
    phone: string;
    commissionPercent: number;
  }, assignedBy: string) {
    return this.vendedorService.createVendedor(data, assignedBy);
  }

  async createPortero(data: {
    email: string;
    password: string;
    name: string;
    dni: string;
    phone: string;
  }, assignedBy: string) {
    return this.porteroService.createPortero(data, assignedBy);
  }

  async getAllVendedores(assignedBy?: string) {
    return this.vendedorService.getAllVendedores(assignedBy);
  }

  async getAllPorteros(assignedBy?: string) {
    return this.porteroService.getAllPorteros(assignedBy);
  }

  async exportUsersToExcel() {
    const users = await this.adminRepository.getAllUsersForExport();
    
    // Importar xlsx dinámicamente
    const XLSX = require('xlsx');
    
    // Preparar los datos para el Excel
    const excelData = users.map((user: any) => {
      const row: any = {
        'ID': user.id,
        'Email': user.email,
        'Nombre': user.name || '',
        'DNI': user.dni || '',
        'Teléfono': user.phone || '',
        'Rol': user.role,
        'Email Verificado': user.emailVerified ? 'Sí' : 'No',
        'Fecha de Registro': new Date(user.createdAt).toLocaleDateString('es-AR'),
        'Última Actualización': new Date(user.updatedAt).toLocaleDateString('es-AR'),
      };

      // Datos específicos de vendedor
      if (user.vendedorProfile) {
        row['Tipo'] = 'Vendedor';
        row['Comisión (%)'] = user.vendedorProfile.commissionPercent || '';
        row['Ganancias Totales'] = user.vendedorProfile.totalEarnings || 0;
        row['Ventas Completadas'] = user.vendedorProfile._count?.sales || 0;
        row['Eventos Asignados'] = user.vendedorProfile._count?.events || 0;
        row['Asignado por'] = user.vendedorProfile.assignedByUser?.name || '';
        row['Email Asignador'] = user.vendedorProfile.assignedByUser?.email || '';
      } else if (user.porteroProfile) {
        row['Tipo'] = 'Portero';
        row['Escaneos Realizados'] = user._count?.validations || 0;
        row['Asignado por'] = user.porteroProfile.assignedByUser?.name || '';
        row['Email Asignador'] = user.porteroProfile.assignedByUser?.email || '';
      } else {
        row['Tipo'] = 'Usuario Regular';
      }

      // Estadísticas generales
      row['Entradas Compradas'] = user._count?.ticketsPurchased || 0;
      row['Órdenes Realizadas'] = user._count?.orders || 0;
      row['Eventos Creados'] = user._count?.eventsCreated || 0;

      return row;
    });

    // Crear el workbook y worksheet
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Usuarios');

    // Generar el buffer del Excel
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    return excelBuffer;
  }

  async getTrackingConfig(userId: string) {
    let config = await prisma.trackingConfig.findUnique({
      where: { userId },
    });

    // Si no existe, crear una configuración por defecto
    if (!config) {
      config = await prisma.trackingConfig.create({
        data: {
          userId,
          metaPixelId: null,
          googleAdsId: null,
        },
      });
    }

    return {
      metaPixelId: config.metaPixelId,
      googleAdsId: config.googleAdsId,
    };
  }

  async updateTrackingConfig(userId: string, data: { metaPixelId?: string; googleAdsId?: string }) {
    const config = await prisma.trackingConfig.upsert({
      where: { userId },
      update: {
        metaPixelId: data.metaPixelId !== undefined ? data.metaPixelId : undefined,
        googleAdsId: data.googleAdsId !== undefined ? data.googleAdsId : undefined,
      },
      create: {
        userId,
        metaPixelId: data.metaPixelId || null,
        googleAdsId: data.googleAdsId || null,
      },
    });

    return {
      metaPixelId: config.metaPixelId,
      googleAdsId: config.googleAdsId,
    };
  }

  async getAccountingConfig(userId: string) {
    return AccountingService.getConfig(userId);
  }

  async updateAccountingConfig(userId: string, data: any) {
    return AccountingService.updateConfig(userId, data);
  }

  /**
   * Regala entradas por email
   * Si el usuario no existe, lo crea automáticamente
   */
  async giftTicketsByEmail(data: {
    eventId: string;
    ticketTypeId: string;
    quantity: number;
    recipientEmail: string;
    recipientName?: string;
    message?: string;
  }, organizerId: string) {
    const { eventId, ticketTypeId, quantity, recipientEmail, recipientName, message } = data;

    // Validar que el evento existe y pertenece al organizador
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        ticketTypes: true,
        organizer: true,
      },
    });

    if (!event) {
      throw new AppError('Evento no encontrado', 404, 'EVENT_NOT_FOUND');
    }

    if (event.organizerId !== organizerId) {
      throw new AppError('No tienes permiso para regalar entradas de este evento', 403, 'FORBIDDEN');
    }

    // Validar que el tipo de entrada existe y pertenece al evento
    const ticketType = event.ticketTypes.find((tt) => tt.id === ticketTypeId);
    if (!ticketType) {
      throw new AppError('Tipo de entrada no encontrado', 404, 'TICKET_TYPE_NOT_FOUND');
    }

    // Validar disponibilidad
    if (ticketType.availableQty < quantity) {
      throw new AppError(`No hay suficientes entradas disponibles. Disponibles: ${ticketType.availableQty}`, 400, 'INSUFFICIENT_TICKETS');
    }

    // Buscar o crear usuario
    let recipient = await prisma.user.findUnique({
      where: { email: recipientEmail },
    });

    let registrationToken: string | null = null;

    if (!recipient) {
      // Crear usuario automáticamente
      const passwordService = new PasswordService();
      // Generar contraseña temporal aleatoria
      const tempPassword = crypto.randomBytes(12).toString('hex');
      const hashedPassword = await passwordService.hash(tempPassword);

      // Generar DNI temporal único (solo para usuarios creados automáticamente)
      const tempDni = `999${Date.now().toString().slice(-8)}`;
      
      // Verificar que el DNI temporal no exista
      let dniExists = await prisma.user.findUnique({ where: { dni: tempDni } });
      let finalDni = tempDni;
      let counter = 0;
      while (dniExists && counter < 100) {
        finalDni = `999${Date.now().toString().slice(-8)}${counter}`;
        dniExists = await prisma.user.findUnique({ where: { dni: finalDni } });
        counter++;
      }

      // Generar QR personal
      const tempId = `temp-${Date.now()}`;
      const { qrCode, qrHash } = QRService.generatePersonalQRCode(tempId);

      // Crear usuario
      recipient = await prisma.user.create({
        data: {
          email: recipientEmail,
          password: hashedPassword,
          name: recipientName || recipientEmail.split('@')[0],
          dni: finalDni,
          phone: '0000000000', // Teléfono temporal
          role: 'USER',
          emailVerified: false,
          personalQRCode: null,
          personalQRHash: null,
        },
      });

      // Generar QR personal con el ID real
      const { qrCode: finalQRCode, qrHash: finalQRHash } = QRService.generatePersonalQRCode(recipient.id);
      
      // Actualizar con el QR personal real
      recipient = await prisma.user.update({
        where: { id: recipient.id },
        data: {
          personalQRCode: finalQRCode,
          personalQRHash: finalQRHash,
        },
      });

      // Generar token de registro automático (válido por 30 días)
      registrationToken = crypto.randomBytes(32).toString('hex');
      await redisClient.setEx(
        `gift-registration:${registrationToken}`,
        30 * 24 * 60 * 60, // 30 días
        JSON.stringify({
          userId: recipient.id,
          email: recipientEmail,
        })
      );
      
      // TODO: Enviar email con link de registro automático
    }

    // Crear orden especial para regalo (sin pago)
    const order = await prisma.order.create({
      data: {
        userId: recipient.id,
        eventId: eventId,
        totalAmount: 0, // Gratis
        paymentMethod: 'CASH', // Método especial para regalos
        paymentStatus: 'COMPLETED', // Ya está completado porque es un regalo
        completedAt: new Date(),
      },
    });

    // Crear tickets
    const tickets = [];
    const purchaseDate = new Date();
    const expiresAt = DateService.addBusinessDays(purchaseDate, 48);

    for (let i = 0; i < quantity; i++) {
      const qrCode = QRService.generateQRCode(order.id, eventId, recipient.id);
      const qrHash = QRService.generateQRHash(order.id, eventId, recipient.id);

      const ticket = await prisma.ticket.create({
        data: {
          ticketTypeId: ticketTypeId,
          eventId: eventId,
          ownerId: recipient.id,
          orderId: order.id,
          qrCode,
          qrHash,
          status: 'ACTIVE',
          purchaseDate,
          expiresAt,
        },
        include: {
          event: true,
          ticketType: true,
        },
      });

      tickets.push(ticket);

      // Actualizar cantidad vendida
      await prisma.ticketType.update({
        where: { id: ticketTypeId },
        data: {
          soldQty: { increment: 1 },
          availableQty: { decrement: 1 },
        },
      });
    }

    // TODO: Enviar email al destinatario con las entradas y link de registro

    const registrationLink = registrationToken 
      ? `${config.frontendUrl}/complete-registration?token=${registrationToken}`
      : null;

    return {
      success: true,
      message: recipient.emailVerified 
        ? `Se regalaron ${quantity} entradas a ${recipient.email}` 
        : `Se regalaron ${quantity} entradas a ${recipient.email}. El usuario debe completar su registro para verlas.`,
      recipient: {
        id: recipient.id,
        email: recipient.email,
        name: recipient.name,
        emailVerified: recipient.emailVerified,
      },
      registrationLink, // Link para completar el registro (solo si el usuario fue creado automáticamente)
      tickets: tickets.map((t) => ({
        id: t.id,
        qrCode: t.qrCode,
        status: t.status,
      })),
    };
  }
}

