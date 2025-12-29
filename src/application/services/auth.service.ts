import { z } from 'zod';
import crypto from 'crypto';
import { UserRepository } from '../../infrastructure/repositories/UserRepository';
import { PasswordService } from '../../infrastructure/services/password.service';
import { JwtService } from '../../infrastructure/services/jwt.service';
import { redisClient } from '../../infrastructure/redis/client';
import { AppError } from '../../infrastructure/middleware/error.middleware';
import { config } from '../../infrastructure/config';
import { prisma } from '../../infrastructure/database/prisma';

const registerSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  dni: z.string().regex(/^\d{7,8}$/, 'DNI inválido'),
  phone: z.string().min(1, 'El teléfono es obligatorio'),
});

export class AuthService {
  private userRepository: UserRepository;
  private passwordService: PasswordService;
  private jwtService: JwtService;

  constructor() {
    this.userRepository = new UserRepository();
    this.passwordService = new PasswordService();
    this.jwtService = new JwtService();
  }

  async register(data: unknown) {
    // Validar datos
    const validatedData = registerSchema.parse(data);

    // Verificar que email y DNI no existan
    const existingUser = await this.userRepository.findByEmail(validatedData.email);
    if (existingUser) {
      throw new AppError('El email ya está registrado', 409, 'EMAIL_ALREADY_EXISTS');
    }

    const existingDni = await this.userRepository.findByDni(validatedData.dni);
    if (existingDni) {
      throw new AppError('El DNI ya está registrado', 409, 'DNI_ALREADY_EXISTS');
    }

    // Hash de contraseña
    const hashedPassword = await this.passwordService.hash(validatedData.password);

    // Crear usuario
    const user = await this.userRepository.create({
      email: validatedData.email,
      password: hashedPassword,
      name: validatedData.name,
      dni: validatedData.dni,
      phone: validatedData.phone,
    });

    // Generar token de verificación de email
    const verificationToken = crypto.randomBytes(32).toString('hex');
    await redisClient.setEx(
      `email-verification:${verificationToken}`,
      24 * 60 * 60, // 24 horas
      user.id
    );

    // TODO: Enviar email de verificación

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      emailVerified: user.emailVerified,
      verificationToken, // Solo para desarrollo, en producción se envía por email
    };
  }

  async login(email: string, password: string) {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new AppError('Credenciales inválidas', 401, 'INVALID_CREDENTIALS');
    }

    // Obtener password hash de la base de datos
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { password: true },
    });

    if (!dbUser) {
      throw new AppError('Usuario no encontrado', 404, 'USER_NOT_FOUND');
    }

    const isValidPassword = await this.passwordService.compare(password, dbUser.password);
    if (!isValidPassword) {
      throw new AppError('Credenciales inválidas', 401, 'INVALID_CREDENTIALS');
    }

    // Generar tokens
    const accessToken = this.jwtService.generateAccessToken(user);
    const refreshToken = this.jwtService.generateRefreshToken(user);

    // Almacenar refresh token en Redis
    await redisClient.setEx(
      `refresh-token:${user.id}`,
      7 * 24 * 60 * 60, // 7 días
      refreshToken
    );

    return {
      token: accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verifyRefreshToken(refreshToken);
      
      // Verificar que el refresh token esté en Redis
      const storedToken = await redisClient.get(`refresh-token:${payload.userId}`);
      if (storedToken !== refreshToken) {
        throw new AppError('Refresh token inválido', 401, 'INVALID_REFRESH_TOKEN');
      }

      const user = await this.userRepository.findById(payload.userId);
      if (!user) {
        throw new AppError('Usuario no encontrado', 404, 'USER_NOT_FOUND');
      }

      // Generar nuevo access token
      const newAccessToken = this.jwtService.generateAccessToken(user);

      return {
        token: newAccessToken,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Refresh token inválido', 401, 'INVALID_REFRESH_TOKEN');
    }
  }

  async getMe(userId: string) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AppError('Usuario no encontrado', 404, 'USER_NOT_FOUND');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      dni: user.dni,
      phone: user.phone,
      emailVerified: user.emailVerified,
    };
  }

  async verifyEmail(token: string) {
    const userId = await redisClient.get(`email-verification:${token}`);
    if (!userId) {
      throw new AppError('Token de verificación inválido o expirado', 400, 'INVALID_VERIFICATION_TOKEN');
    }

    await this.userRepository.updateEmailVerification(userId, true);
    await redisClient.del(`email-verification:${token}`);

    return { success: true };
  }

  async getPersonalQR(userId: string) {
    const qrData = await this.userRepository.getPersonalQR(userId);
    if (!qrData) {
      throw new AppError('No se pudo generar el QR personal', 500, 'QR_GENERATION_ERROR');
    }
    return qrData;
  }
}

