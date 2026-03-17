/**
 * Asegura que la tabla Event tenga todas las columnas que espera Prisma.
 * Usa la URL directa DATABASE_URL (postgres://), no el proxy PRISMA_DATABASE_URL.
 *
 * Ejecutar: npm run db:add-auth-column
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const directUrl = process.env.DATABASE_URL;
if (!directUrl || !directUrl.startsWith('postgres')) {
  console.error('Falta DATABASE_URL (postgres://...) en .env. Se usa para conexión directa.');
  process.exit(1);
}

const prisma = new PrismaClient({ datasourceUrl: directUrl });

const EVENT_COLUMNS_TO_ADD = [
  'authorizationCode',
  'bannerTop',
  'bannerEmail',
];

async function main() {
  await prisma.$connect();
  for (const col of EVENT_COLUMNS_TO_ADD) {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "${col}" TEXT;`
    );
    console.log(`Event.${col} agregada (o ya existía).`);
  }
  console.log('Listo. Volvé a intentar crear el evento.');
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
