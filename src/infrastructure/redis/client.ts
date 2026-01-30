import { createClient, RedisClientType } from 'redis';
import { config } from '../config';
import { logger } from '../logger';

const hasValidRedisUrl = Boolean(config.redis.url);

/** Cliente dummy cuando Redis no está configurado (ej. Vercel sin KV). No crashea; operaciones son no-op. */
const noopClient = {
  connect: async () => {},
  quit: async () => {},
  setEx: async () => {},
  get: async (): Promise<string | null> => null,
  del: async () => {},
  ping: async (): Promise<string> => {
    throw new Error('Redis no configurado');
  },
} as unknown as RedisClientType;

let client: RedisClientType;

if (hasValidRedisUrl) {
  client = createClient({
    url: config.redis.url,
  });
  client.on('error', (err) => logger.error('Error de Redis:', err));
  client.on('connect', () => logger.info('✅ Conectado a Redis'));
} else {
  logger.warn('REDIS_URL inválida o no configurada; Redis deshabilitado (refresh tokens y cache no persistirán).');
  client = noopClient;
}

export const redisClient = client;

/** true si hay un Redis real conectado (para health check). */
export const isRedisAvailable = (): boolean => hasValidRedisUrl;

export async function connectRedis(): Promise<void> {
  if (!hasValidRedisUrl) {
    return;
  }
  try {
    await redisClient.connect();
    logger.info('✅ Redis conectado');
  } catch (error) {
    logger.error('❌ Error conectando a Redis:', error);
    throw error;
  }
}

export async function disconnectRedis(): Promise<void> {
  if (hasValidRedisUrl && redisClient.isOpen) {
    await redisClient.quit();
  }
}
