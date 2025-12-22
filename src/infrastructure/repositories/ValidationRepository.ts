import { prisma } from '../database/prisma';

export class ValidationRepository {
  async scanQR(qrCode: string, eventId: string, validatorId: string) {
    // TODO: Implementar escaneo de QR
    throw new Error('No implementado');
  }

  async validateByCode(ticketCode: string, eventId: string, validatorId: string) {
    // TODO: Implementar validación por código
    throw new Error('No implementado');
  }

  async getHistory(eventId: string, userId: string, query: any) {
    return prisma.ticketValidation.findMany({
      where: {
        ticket: {
          eventId,
        },
        validatorId: userId,
      },
      include: {
        ticket: {
          include: {
            ticketType: true,
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
    });
  }
}

