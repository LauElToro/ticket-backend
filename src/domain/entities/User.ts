import { UserRole } from '@prisma/client';

export class User {
  constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly name: string,
    public readonly dni: string,
    public readonly phone: string | null,
    public readonly role: UserRole,
    public readonly emailVerified: boolean,
    public readonly createdAt: Date,
    public readonly updatedAt: Date
  ) {}

  static fromPrisma(user: any): User {
    return new User(
      user.id,
      user.email,
      user.name,
      user.dni,
      user.phone,
      user.role,
      user.emailVerified,
      user.createdAt,
      user.updatedAt
    );
  }

  canCreateEvents(): boolean {
    return this.role === 'ORGANIZER' || this.role === 'ADMIN';
  }

  canValidateTickets(): boolean {
    return this.role === 'VALIDATOR' || this.role === 'ADMIN';
  }

  isAdmin(): boolean {
    return this.role === 'ADMIN';
  }
}

