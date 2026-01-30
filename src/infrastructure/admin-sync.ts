import bcrypt from 'bcryptjs';
import { config } from './config';
import { logger } from './logger';
import { prisma } from './database/prisma';

/**
 * Sincroniza el usuario admin con ADMIN_EMAIL y ADMIN_PASSWORD de las variables de entorno.
 * Así en Vercel (donde el seed no corre en el deploy) las credenciales configuradas en env funcionan.
 */
export async function syncAdminFromEnv(): Promise<void> {
  const email = config.admin.email?.trim();
  const password = config.admin.password;

  if (!email || !password || password.length < 6) {
    return;
  }

  try {
    const existing = await prisma.user.findUnique({
      where: { email },
    });

    const hashedPassword = await bcrypt.hash(password, 10);

    if (existing) {
      if (existing.role !== 'ADMIN') {
        await prisma.user.update({
          where: { id: existing.id },
          data: { role: 'ADMIN', password: hashedPassword },
        });
        logger.info('Usuario actualizado a ADMIN y contraseña sincronizada desde env');
      } else {
        await prisma.user.update({
          where: { id: existing.id },
          data: { password: hashedPassword },
        });
        logger.info('Contraseña de admin sincronizada desde env');
      }
    } else {
      await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name: 'Administrador',
          dni: '00000000',
          phone: '0000000000',
          role: 'ADMIN',
          emailVerified: true,
        },
      });
      logger.info('Usuario admin creado desde env:', email);
    }
  } catch (error) {
    logger.error('Error sincronizando admin desde env:', error);
    // No lanzar: el arranque sigue; el usuario puede correr el seed manualmente
  }
}
