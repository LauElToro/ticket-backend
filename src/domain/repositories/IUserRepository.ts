import { User } from '../entities/User';
import { UserRole } from '@prisma/client';

export interface IUserRepository {
  findByEmail(email: string): Promise<User | null>;
  findByDni(dni: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  create(userData: {
    email: string;
    password: string;
    name: string;
    dni: string;
    phone: string;
    role?: UserRole;
  }): Promise<User>;
  update(id: string, data: Partial<User>): Promise<User>;
  updateEmailVerification(id: string, verified: boolean): Promise<void>;
  getPersonalQR(userId: string): Promise<{ qrCode: string; qrHash: string } | null>;
  findByPersonalQR(personalQRCode: string): Promise<User | null>;
}
