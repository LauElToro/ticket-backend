import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './infrastructure/config';
import { logger } from './infrastructure/logger';
import { connectDatabase } from './infrastructure/database/prisma';
import { connectRedis } from './infrastructure/redis/client';
import { errorHandler } from './infrastructure/middleware/error.middleware';
import { authRoutes } from './presentation/routes/auth.routes';
import { eventRoutes } from './presentation/routes/event.routes';
import { ticketRoutes } from './presentation/routes/ticket.routes';
import { orderRoutes } from './presentation/routes/order.routes';
import { transferRoutes } from './presentation/routes/transfer.routes';
import { validationRoutes } from './presentation/routes/validation.routes';
import { adminRoutes } from './presentation/routes/admin.routes';
import { healthRoutes } from './presentation/routes/health.routes';
import { uploadRoutes } from './presentation/routes/upload.routes';
import { paymentPlacesRoutes } from './presentation/routes/payment-places.routes';
import { favoriteRoutes } from './presentation/routes/favorite.routes';
import { paymentRoutes } from './presentation/routes/payment.routes';
import { webhookRoutes } from './presentation/routes/webhook.routes';
import { vendedorRoutes } from './presentation/routes/vendedor.routes';
import { porteroRoutes } from './presentation/routes/portero.routes';
import { trackingRoutes } from './presentation/routes/tracking.routes';
import { startTicketExpirationJob } from './infrastructure/jobs/ticket-expiration.job';
import path from 'path';

const app = express();

// Conectar a base de datos y Redis
async function startServer() {
  try {
    await connectDatabase();
    await connectRedis();
  } catch (error) {
    logger.error('Error iniciando servicios:', error);
    process.exit(1);
  }
}

// Middlewares básicos
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configurado para desarrollo local
const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // Permitir requests sin origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:3000',
      config.frontendUrl,
    ];
    
    if (config.nodeEnv === 'development' || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('No permitido por CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Refresh-Token'],
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos (imágenes subidas)
app.use('/uploads', express.static(path.join(process.cwd(), 'public', 'uploads')));

// Logging de requests
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  next();
});

// Routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/transfers', transferRoutes);
app.use('/api/validation', validationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/payment-places', paymentPlacesRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/vendedores', vendedorRoutes);
app.use('/api/porteros', porteroRoutes);
app.use('/api/tracking', trackingRoutes);

// Error handler
app.use(errorHandler);

// Iniciar servidor
const PORT = config.port || 3000;

startServer().then(() => {
  // Iniciar job de expiración de tickets
  startTicketExpirationJob();
  
  app.listen(PORT, () => {
    logger.info(`🚀 Servidor iniciado en puerto ${PORT}`);
    logger.info(`📝 Ambiente: ${config.nodeEnv}`);
    logger.info(`🌐 Frontend URL: ${config.frontendUrl}`);
  });
});

export default app;

