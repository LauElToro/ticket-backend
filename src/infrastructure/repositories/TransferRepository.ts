import { prisma } from '../database/prisma';
import { QRService } from '../services/qr.service';
import { DateService } from '../services/date.service';

export class TransferRepository {
  /**
   * Transfiere una entrada inmediatamente (como Quentro)
   * @param data { ticketId, toEmail?, toUserId?, method: 'EMAIL' | 'QR' }
   */
  async transfer(data: any, userId: string) {
    const { ticketId, toEmail, toUserId, method = 'EMAIL' } = data;

    // Verificar que el ticket existe y pertenece al usuario
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { event: true },
    });

    if (!ticket) {
      throw new Error('Entrada no encontrada');
    }

    if (ticket.ownerId !== userId) {
      throw new Error('No eres el dueño de esta entrada');
    }

    if (ticket.status !== 'ACTIVE') {
      throw new Error('La entrada no está activa para transferir');
    }

    if (DateService.isExpired(ticket.expiresAt)) {
      throw new Error('La entrada ha expirado');
    }

    let toUser;

    // Si el método es QR, toUserId debe estar presente
    if (method === 'QR') {
      if (!toUserId) {
        throw new Error('Se requiere el ID del usuario receptor para transferencia por QR');
      }
      
      toUser = await prisma.user.findUnique({
        where: { id: toUserId },
      });

      if (!toUser) {
        throw new Error('Usuario receptor no encontrado');
      }
    } else {
      // Método EMAIL
      if (!toEmail) {
        throw new Error('Se requiere el email del usuario receptor');
      }

      toUser = await prisma.user.findUnique({
        where: { email: toEmail },
      });

      if (!toUser) {
        throw new Error('El usuario con ese email no está registrado en la plataforma');
      }
    }

    if (toUser.id === userId) {
      throw new Error('No puedes transferirte la entrada a ti mismo');
    }

    // Realizar la transferencia inmediatamente en una transacción
    return await prisma.$transaction(async (tx) => {
      // Actualizar el ticket con el nuevo dueño
      await tx.ticket.update({
        where: { id: ticketId },
        data: {
          ownerId: toUser.id,
          status: 'ACTIVE', // Mantener activa, solo cambia el dueño
        },
      });

      // Crear registro de transferencia
      const transfer = await tx.ticketTransfer.create({
        data: {
          ticketId,
          fromUserId: userId,
          toUserId: toUser.id,
          toEmail: toEmail || toUser.email,
          method: method as 'EMAIL' | 'QR',
          status: 'COMPLETED', // Transferencia completada inmediatamente
          completedAt: new Date(),
        },
        include: {
          ticket: {
            include: {
              event: true,
              ticketType: true,
            },
          },
          fromUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          toUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return transfer;
    });
  }

  /**
   * Obtiene el historial de transferencias de un usuario
   */
  async getTransferHistory(userId: string) {
    const sent = await prisma.ticketTransfer.findMany({
      where: {
        fromUserId: userId,
      },
      include: {
        ticket: {
          include: {
            event: true,
            ticketType: true,
          },
        },
        toUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const received = await prisma.ticketTransfer.findMany({
      where: {
        toUserId: userId,
      },
      include: {
        ticket: {
          include: {
            event: true,
            ticketType: true,
          },
        },
        fromUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return { sent, received };
  }
}
