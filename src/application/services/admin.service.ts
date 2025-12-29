import { AdminRepository } from '../../infrastructure/repositories/AdminRepository';
import { VendedorService } from './vendedor.service';
import { PorteroService } from './portero.service';
import { AccountingService } from './accounting.service';
import { AppError } from '../../infrastructure/middleware/error.middleware';
import { PrismaClient } from '@prisma/client';

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
}

