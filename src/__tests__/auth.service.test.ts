import { AuthService } from '../application/services/auth.service';
import { UserRepository } from '../infrastructure/repositories/UserRepository';
import { PasswordService } from '../infrastructure/services/password.service';
import { AppError } from '../infrastructure/middleware/error.middleware';

jest.mock('../infrastructure/repositories/UserRepository');
jest.mock('../infrastructure/services/password.service');
jest.mock('../infrastructure/redis/client');

describe('AuthService', () => {
  let authService: AuthService;
  let mockUserRepository: jest.Mocked<UserRepository>;
  let mockPasswordService: jest.Mocked<PasswordService>;

  beforeEach(() => {
    mockUserRepository = new UserRepository() as jest.Mocked<UserRepository>;
    mockPasswordService = new PasswordService() as jest.Mocked<PasswordService>;
    authService = new AuthService();
    (authService as any).userRepository = mockUserRepository;
    (authService as any).passwordService = mockPasswordService;
  });

  describe('register', () => {
    it('debe registrar un nuevo usuario exitosamente', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        dni: '12345678',
      };

      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.findByDni.mockResolvedValue(null);
      mockPasswordService.hash.mockResolvedValue('hashed-password');
      mockUserRepository.create.mockResolvedValue({
        id: 'user-id',
        email: userData.email,
        name: userData.name,
        dni: userData.dni,
        phone: null,
        role: 'USER',
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const result = await authService.register(userData);

      expect(result).toHaveProperty('id');
      expect(result.email).toBe(userData.email);
      expect(mockUserRepository.create).toHaveBeenCalled();
    });

    it('debe lanzar error si el email ya existe', async () => {
      const userData = {
        email: 'existing@example.com',
        password: 'password123',
        name: 'Test User',
        dni: '12345678',
      };

      mockUserRepository.findByEmail.mockResolvedValue({
        id: 'existing-id',
        email: userData.email,
        name: 'Existing User',
        dni: '87654321',
        phone: null,
        role: 'USER',
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      await expect(authService.register(userData)).rejects.toThrow(AppError);
    });
  });
});

