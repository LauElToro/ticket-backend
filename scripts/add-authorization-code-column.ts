/**
 * Script de un solo uso: agrega la columna authorizationCode a la tabla Event
 * si no existe. Usa la URL directa DATABASE_URL (postgres://), no el proxy PRISMA_DATABASE_URL.
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

async function main() {
  await prisma.$connect();
  await prisma.$executeRawUnsafe(
    'ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "authorizationCode" TEXT;'
  );
  console.log('Columna Event.authorizationCode agregada (o ya existía).');
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
