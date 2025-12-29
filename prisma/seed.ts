import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed...');

  // Crear usuario admin
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@ticketya.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        name: 'Administrador',
        dni: '00000000',
        phone: '0000000000', // Teléfono por defecto para admin
        role: 'ADMIN',
        emailVerified: true,
      },
    });
    console.log('✅ Usuario admin creado:', admin.email);
  } else {
    // Actualizar admin existente si no tiene teléfono
    if (!existingAdmin.phone) {
      await prisma.user.update({
        where: { id: existingAdmin.id },
        data: { phone: '0000000000' },
      });
      console.log('✅ Teléfono agregado al usuario admin existente');
    }
    console.log('ℹ️  Usuario admin ya existe');
  }

  // Crear usuario organizador de ejemplo
  const organizerEmail = 'organizer@ticketya.com';
  const existingOrganizer = await prisma.user.findUnique({
    where: { email: organizerEmail },
  });

  if (!existingOrganizer) {
    const hashedPassword = await bcrypt.hash('organizer123', 10);
    const organizer = await prisma.user.create({
      data: {
        email: organizerEmail,
        password: hashedPassword,
        name: 'Organizador Ejemplo',
        dni: '11111111',
        phone: '1111111111', // Teléfono por defecto para organizador
        role: 'ORGANIZER',
        emailVerified: true,
      },
    });
    console.log('✅ Usuario organizador creado:', organizer.email);
  } else {
    // Actualizar organizador existente si no tiene teléfono
    if (!existingOrganizer.phone) {
      await prisma.user.update({
        where: { id: existingOrganizer.id },
        data: { phone: '1111111111' },
      });
      console.log('✅ Teléfono agregado al usuario organizador existente');
    }
  }

  console.log('✅ Seed completado');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

