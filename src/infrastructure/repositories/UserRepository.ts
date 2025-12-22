import { prisma } from '../database/prisma';
import { User } from '../../domain/entities/User';
import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { UserRole } from '@prisma/client';
import { QRService } from '../services/qr.service';

export class UserRepository implements IUserRepository {
  async findByEmail(email: string): Promise<User | null> {
    const user = await prisma.user.findUnique({
      where: { email },
    });
    return user ? User.fromPrisma(user) : null;
  }

  async findByDni(dni: string): Promise<User | null> {
    const user = await prisma.user.findUnique({
      where: { dni },
    });
    return user ? User.fromPrisma(user) : null;
  }

  async findById(id: string): Promise<User | null> {
    const user = await prisma.user.findUnique({
      where: { id },
    });
    return user ? User.fromPrisma(user) : null;
  }

  async create(userData: {
    email: string;
    password: string;
    name: string;
    dni: string;
    phone?: string;
    role?: UserRole;
  }): Promise<User> {
    // Generar QR personal antes de crear el usuario
    const tempId = `temp-${Date.now()}`;
    const { qrCode, qrHash } = QRService.generatePersonalQRCode(tempId);
    
    // Crear usuario con QR personal
    const user = await prisma.user.create({
      data: {
        email: userData.email,
        password: userData.password,
        name: userData.name,
        dni: userData.dni,
        phone: userData.phone,
        role: userData.role || 'USER',
        personalQRCode: null, // Se generará después con el ID real
        personalQRHash: null,
      },
    });

    // Generar QR personal con el ID real del usuario
    const { qrCode: finalQRCode, qrHash: finalQRHash } = QRService.generatePersonalQRCode(user.id);
    
    // Actualizar con el QR personal real
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        personalQRCode: finalQRCode,
        personalQRHash: finalQRHash,
      },
    });

    return User.fromPrisma(updatedUser);
  }

  async getPersonalQR(userId: string): Promise<{ qrCode: string; qrHash: string } | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { personalQRCode: true, personalQRHash: true },
    });

    if (!user || !user.personalQRCode) {
      // Generar QR si no existe
      const { qrCode, qrHash } = QRService.generatePersonalQRCode(userId);
      await prisma.user.update({
        where: { id: userId },
        data: { personalQRCode: qrCode, personalQRHash: qrHash },
      });
      return { qrCode, qrHash };
    }

    return {
      qrCode: user.personalQRCode,
      qrHash: user.personalQRHash!,
    };
  }

  async findByPersonalQR(personalQRCode: string): Promise<User | null> {
    const user = await prisma.user.findUnique({
      where: { personalQRCode },
    });
    return user ? User.fromPrisma(user) : null;
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.role && { role: data.role }),
      },
    });
    return User.fromPrisma(user);
  }

  async updateEmailVerification(id: string, verified: boolean): Promise<void> {
    await prisma.user.update({
      where: { id },
      data: { emailVerified: verified },
    });
  }
}

