import { PrismaClient } from '@prisma/client';
import { logger } from '../logger';

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'error', 'warn'] 
    : ['error'],
});

// Manejar desconexión graceful
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

// Manejar errores de conexión
prisma.$on('error' as never, (e: Error) => {
  logger.error('Error de Prisma:', e);
});

export async function connectDatabase() {
  try {
    await prisma.$connect();
    logger.info('✅ Conectado a PostgreSQL');
  } catch (error) {
    logger.error('❌ Error conectando a PostgreSQL:', error);
    throw error;
  }
}

