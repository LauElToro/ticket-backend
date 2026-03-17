/**
 * Asegura que Event y TicketType tengan todas las columnas que espera Prisma.
 * Usa la URL directa DATABASE_URL (postgres://), no el proxy PRISMA_DATABASE_URL.
 *
 * Ejecutar: npm run db:add-auth-column
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const directUrl = process.env.DATABASE_URL;
if (!directUrl || !directUrl.startsWith('postgres')) {
  console.error('Este script necesita la URL directa de Postgres (postgres:// o postgresql://).');
  console.error('No uses la URL de Prisma Accelerate (prisma+postgres://). En .env usá DATABASE_URL con la URL directa.');
  process.exit(1);
}

const prisma = new PrismaClient({ datasourceUrl: directUrl });

const EVENT_COLUMNS = [
  'authorizationCode',
  'bannerTop',
  'bannerEmail',
];

const TICKET_TYPE_COLUMNS: { name: string; sql: string }[] = [
  { name: 'description', sql: 'ALTER TABLE "TicketType" ADD COLUMN IF NOT EXISTS "description" TEXT;' },
  { name: 'status', sql: 'ALTER TABLE "TicketType" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT \'Activo\';' },
  { name: 'ticketKind', sql: 'ALTER TABLE "TicketType" ADD COLUMN IF NOT EXISTS "ticketKind" TEXT;' },
  { name: 'image', sql: 'ALTER TABLE "TicketType" ADD COLUMN IF NOT EXISTS "image" TEXT;' },
  { name: 'saleEndDate', sql: 'ALTER TABLE "TicketType" ADD COLUMN IF NOT EXISTS "saleEndDate" TIMESTAMP(3);' },
  { name: 'saleEndTime', sql: 'ALTER TABLE "TicketType" ADD COLUMN IF NOT EXISTS "saleEndTime" TEXT;' },
  { name: 'validUntil', sql: 'ALTER TABLE "TicketType" ADD COLUMN IF NOT EXISTS "validUntil" TIMESTAMP(3);' },
  { name: 'validUntilTime', sql: 'ALTER TABLE "TicketType" ADD COLUMN IF NOT EXISTS "validUntilTime" TEXT;' },
];

const VENDEDOR_COLUMNS: { name: string; sql: string }[] = [
  { name: 'cvuCbu', sql: 'ALTER TABLE "Vendedor" ADD COLUMN IF NOT EXISTS "cvuCbu" TEXT;' },
];


async function main() {
  await prisma.$connect();

  for (const col of EVENT_COLUMNS) {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "${col}" TEXT;`
    );
    console.log(`Event.${col} agregada (o ya existía).`);
  }

  for (const { name, sql } of TICKET_TYPE_COLUMNS) {
    await prisma.$executeRawUnsafe(sql);
    console.log(`TicketType.${name} agregada (o ya existía).`);
  }

  for (const { name, sql } of VENDEDOR_COLUMNS) {
    await prisma.$executeRawUnsafe(sql);
    console.log(`Vendedor.${name} agregada (o ya existía).`);
  }

  console.log('Listo. Volvé a intentar crear evento y promotores.');
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
