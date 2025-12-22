import { Router } from 'express';
import { prisma } from '../../infrastructure/database/prisma';
import { redisClient } from '../../infrastructure/redis/client';

const router = Router();

router.get('/', async (req, res) => {
  try {
    // Verificar PostgreSQL
    await prisma.$queryRaw`SELECT 1`;
    const dbStatus = 'ok';

    // Verificar Redis
    let redisStatus = 'ok';
    try {
      await redisClient.ping();
    } catch {
      redisStatus = 'error';
    }

    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        database: dbStatus,
        redis: redisStatus,
      },
    };

    const allOk = dbStatus === 'ok' && redisStatus === 'ok';
    res.status(allOk ? 200 : 503).json(health);
  } catch (error) {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Service unavailable',
    });
  }
});

export { router as healthRoutes };

