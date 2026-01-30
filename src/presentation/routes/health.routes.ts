import { Router } from 'express';
import { prisma } from '../../infrastructure/database/prisma';
import { redisClient, isRedisAvailable } from '../../infrastructure/redis/client';

const router = Router();
const REDIS_PING_TIMEOUT_MS = 3000;

router.get('/', async (req, res) => {
  try {
    // Verificar PostgreSQL (crítico)
    await prisma.$queryRaw`SELECT 1`;
    const dbStatus = 'ok';

    // Verificar Redis solo si está configurado (en Vercel puede estar deshabilitado)
    let redisStatus: 'ok' | 'error' | 'disabled' = 'disabled';
    if (isRedisAvailable()) {
      try {
        const pingPromise = redisClient.ping();
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), REDIS_PING_TIMEOUT_MS)
        );
        await Promise.race([pingPromise, timeoutPromise]);
        redisStatus = 'ok';
      } catch {
        redisStatus = 'error';
      }
    }

    const health = {
      status: dbStatus === 'ok' ? (redisStatus === 'ok' ? 'ok' : 'degraded') : 'error',
      timestamp: new Date().toISOString(),
      services: {
        database: dbStatus,
        redis: redisStatus,
      },
    };

    // 200 si la DB responde (Redis opcional para deploy serverless)
    const httpStatus = dbStatus === 'ok' ? 200 : 503;
    res.status(httpStatus).json(health);
  } catch (error) {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Service unavailable',
    });
  }
});

export { router as healthRoutes };

