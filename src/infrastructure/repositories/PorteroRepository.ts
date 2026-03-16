import { prisma } from '../database/prisma';

export class PorteroRepository {
  async create(data: {
    userId: string;
    assignedBy: string;
    initialPassword?: string | null;
  }) {
    return prisma.portero.create({
      data: {
        userId: data.userId,
        assignedBy: data.assignedBy,
        initialPassword: data.initialPassword ?? undefined,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            dni: true,
            phone: true,
          },
        },
        assignedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async assignToEvent(porteroId: string, eventId: string) {
    return prisma.porteroEvent.upsert({
      where: {
        porteroId_eventId: { porteroId, eventId },
      },
      create: { porteroId, eventId },
      update: {},
    });
  }

  async removeFromEvent(porteroId: string, eventId: string) {
    await prisma.porteroEvent.deleteMany({
      where: { porteroId, eventId },
    });
  }

  async getByEventId(eventId: string) {
    return prisma.porteroEvent.findMany({
      where: { eventId },
      include: {
        portero: {
          include: {
            user: { select: { id: true, email: true, name: true, phone: true } },
          },
        },
      },
    });
  }

  async findByUserId(userId: string) {
    return prisma.portero.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            dni: true,
            phone: true,
          },
        },
        assignedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async findById(id: string) {
    return prisma.portero.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            dni: true,
            phone: true,
          },
        },
        assignedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async updateInitialPassword(porteroId: string, initialPassword: string | null) {
    return prisma.portero.update({
      where: { id: porteroId },
      data: { initialPassword },
    });
  }

  async getAllPorteros(assignedBy?: string) {
    return prisma.portero.findMany({
      where: assignedBy ? { assignedBy } : undefined,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            dni: true,
            phone: true,
          },
        },
        assignedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getScanHistory(porteroId: string, limit: number = 50) {
    const portero = await prisma.portero.findUnique({
      where: { id: porteroId },
      select: { userId: true },
    });

    if (!portero) {
      return [];
    }

    return prisma.ticketValidation.findMany({
      where: {
        validatorId: portero.userId,
      },
      include: {
        ticket: {
          include: {
            event: {
              select: {
                id: true,
                title: true,
                date: true,
              },
            },
            owner: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        scannedAt: 'desc',
      },
      take: limit,
    });
  }

  async getScanHistoryByEvent(porteroId: string, eventId: string, limit: number = 200) {
    const portero = await prisma.portero.findUnique({
      where: { id: porteroId },
      select: { userId: true },
    });
    if (!portero) return [];

    return prisma.ticketValidation.findMany({
      where: {
        validatorId: portero.userId,
        ticket: { eventId },
      },
      include: {
        ticket: {
          include: {
            event: { select: { id: true, title: true, date: true } },
            owner: { select: { id: true, name: true, email: true } },
          },
        },
      },
      orderBy: { scannedAt: 'desc' },
      take: limit,
    });
  }
}

