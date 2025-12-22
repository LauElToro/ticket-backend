import { createClient } from 'redis';
import { config } from '../config';
import { logger } from '../logger';

export const redisClient = createClient({
  url: config.redis.url,
});

redisClient.on('error', (err) => {
  logger.error('Error de Redis:', err);
});

redisClient.on('connect', () => {
  logger.info('✅ Conectado a Redis');
});

export async function connectRedis() {
  try {
    await redisClient.connect();
    logger.info('✅ Redis conectado');
  } catch (error) {
    logger.error('❌ Error conectando a Redis:', error);
    throw error;
  }
}

export async function disconnectRedis() {
  await redisClient.quit();
}

