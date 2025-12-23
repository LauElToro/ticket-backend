import { prisma } from '../database/prisma';

export class PorteroRepository {
  async create(data: {
    userId: string;
    assignedBy: string;
  }) {
    return prisma.portero.create({
      data,
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
        _count: {
          select: {
            scans: true,
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
}

