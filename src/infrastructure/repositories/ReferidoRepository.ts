import { prisma } from '../database/prisma';

export class ReferidoRepository {
  async create(data: {
    vendedorId: string;
    eventId: string;
    customCode: string;
    customUrl: string;
  }) {
    return prisma.referido.create({
      data,
      include: {
        event: {
          select: {
            id: true,
            title: true,
            date: true,
          },
        },
        vendedor: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });
  }

  async findByVendedorId(vendedorId: string) {
    return prisma.referido.findMany({
      where: { vendedorId },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            date: true,
            image: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findByCustomCode(customCode: string) {
    return prisma.referido.findUnique({
      where: { customCode },
      include: {
        event: {
          include: {
            ticketTypes: true,
          },
        },
        vendedor: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });
  }

  async findByCustomUrl(customUrl: string) {
    return prisma.referido.findUnique({
      where: { customUrl },
      include: {
        event: {
          include: {
            ticketTypes: true,
          },
        },
        vendedor: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });
  }

  async updateClickCount(referidoId: string) {
    return prisma.referido.update({
      where: { id: referidoId },
      data: {
        clickCount: {
          increment: 1,
        },
      },
    });
  }

  async updateConversionCount(referidoId: string, count: number = 1) {
    return prisma.referido.update({
      where: { id: referidoId },
      data: {
        conversionCount: {
          increment: count,
        },
      },
    });
  }

  async updateCustomCode(referidoId: string, customCode: string, customUrl: string) {
    return prisma.referido.update({
      where: { id: referidoId },
      data: {
        customCode,
        customUrl,
      },
    });
  }

  async updateAllVendedorCodes(vendedorId: string, customCode: string, baseUrl: string) {
    const referidos = await prisma.referido.findMany({
      where: { vendedorId },
    });

    const updates = referidos.map((ref) => {
      const customUrl = `${baseUrl}/evento/${ref.eventId}?ref=${customCode}`;
      return prisma.referido.update({
        where: { id: ref.id },
        data: {
          customCode,
          customUrl,
        },
      });
    });

    return Promise.all(updates);
  }
}


