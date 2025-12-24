import { prisma } from '../database/prisma';
import { AppError } from '../middleware/error.middleware';

export class FavoriteRepository {
  async addFavorite(userId: string, eventId: string) {
    // Verificar que el evento existe y está activo
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, isActive: true, date: true },
    });

    if (!event) {
      throw new AppError('Evento no encontrado', 404, 'EVENT_NOT_FOUND');
    }

    // Verificar si ya está en favoritos
    const existing = await prisma.favoriteEvent.findUnique({
      where: {
        userId_eventId: {
          userId,
          eventId,
        },
      },
    });

    if (existing) {
      throw new AppError('El evento ya está en favoritos', 409, 'ALREADY_FAVORITE');
    }

    return await prisma.favoriteEvent.create({
      data: {
        userId,
        eventId,
      },
      include: {
        event: {
          include: {
            ticketTypes: true,
            organizer: {
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

  async removeFavorite(userId: string, eventId: string) {
    const favorite = await prisma.favoriteEvent.findUnique({
      where: {
        userId_eventId: {
          userId,
          eventId,
        },
      },
    });

    if (!favorite) {
      throw new AppError('El evento no está en favoritos', 404, 'FAVORITE_NOT_FOUND');
    }

    await prisma.favoriteEvent.delete({
      where: {
        userId_eventId: {
          userId,
          eventId,
        },
      },
    });

    return { success: true };
  }

  async getFavorites(userId: string) {
    const favorites = await prisma.favoriteEvent.findMany({
      where: {
        userId,
        event: {
          isActive: true,
          date: {
            gte: new Date(), // Solo eventos futuros
          },
        },
      },
      include: {
        event: {
          include: {
            ticketTypes: true,
            organizer: {
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
        createdAt: 'desc',
      },
    });

    // Limpiar eventos pasados automáticamente
    const now = new Date();
    const pastFavorites = favorites.filter(
      (fav) => new Date(fav.event.date) < now
    );

    if (pastFavorites.length > 0) {
      await prisma.favoriteEvent.deleteMany({
        where: {
          id: {
            in: pastFavorites.map((f) => f.id),
          },
        },
      });
    }

    // Retornar solo eventos futuros
    return favorites.filter((fav) => new Date(fav.event.date) >= now);
  }

  async isFavorite(userId: string, eventId: string): Promise<boolean> {
    const favorite = await prisma.favoriteEvent.findUnique({
      where: {
        userId_eventId: {
          userId,
          eventId,
        },
      },
    });

    return !!favorite;
  }
}


