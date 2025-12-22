import dotenv from 'dotenv';

dotenv.config();

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',

  database: {
    url: process.env.DATABASE_URL || '',
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  jwt: {
    secret: process.env.JWT_SECRET || '',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET || '',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  mercadopago: {
    accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || '',
    publicKey: process.env.MERCADOPAGO_PUBLIC_KEY || '',
    webhookSecret: process.env.MERCADOPAGO_WEBHOOK_SECRET || '',
  },

  email: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'Ticket-Ya <noreply@ticketya.com>',
  },

  qr: {
    secretKey: process.env.QR_SECRET_KEY || '',
  },

  admin: {
    email: process.env.ADMIN_EMAIL || 'admin@ticketya.com',
    password: process.env.ADMIN_PASSWORD || 'admin123',
  },

  payment: {
    bankAccount: {
      bankName: process.env.PAYMENT_BANK_NAME || 'Banco de la Nación Argentina',
      accountType: process.env.PAYMENT_ACCOUNT_TYPE || 'Cuenta Corriente',
      accountNumber: process.env.PAYMENT_ACCOUNT_NUMBER || '',
      cbu: process.env.PAYMENT_CBU || '',
      alias: process.env.PAYMENT_ALIAS || 'TICKETYA.PAGOS',
      cuit: process.env.PAYMENT_CUIT || '',
      accountHolder: process.env.PAYMENT_ACCOUNT_HOLDER || 'Ticket-Ya S.A.',
    },
  },
};

// Validar variables críticas
const requiredVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'QR_SECRET_KEY',
];

if (config.nodeEnv === 'production') {
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      throw new Error(`Variable de entorno requerida faltante: ${varName}`);
    }
  }
}

