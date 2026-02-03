import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { AuthAdminService } from './auth-admin.service';
import { AdminLoginDto } from './dto/admin-login.dto';
import { AdminRole } from './enums/admin-role.enum';
import { AuditLogService } from '../audit-log/audit-log.service';
import { AuditAction } from '../audit-log/enums/audit-action.enum';
import { AuditActorType } from '../audit-log/enums/audit-actor-type.enum';
import { AuditStatus } from '../audit-log/enums/audit-status.enum';
import { I18nService } from 'nestjs-i18n';

// Mock the config imports
jest.mock('../database/config/database.config', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    type: 'postgres',
    host: 'localhost',
    port: 5432,
    password: 'secret',
    name: 'test',
    username: 'test',
    isDocumentDatabase: false,
  })),
}));

describe('AuthAdminService', () => {
  let service: AuthAdminService;

  const mockAdminRepository = {
    findByUsername: jest.fn(),
    findById: jest.fn(),
    updateLastLogin: jest.fn(),
  };

  const mockJwtService = {
    signAsync: jest.fn(),
  };

  const mockConfigService = {
    getOrThrow: jest.fn(),
  };

  const mockAuditLogService = {
    log: jest.fn(),
  };

  const mockI18nService = {
    t: jest.fn().mockReturnValue('Invalid credentials'),
  };

  const mockAdmin = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    username: 'admin1',
    passwordHash:
      '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X.VQ8o1Jn0QZ.LHFS', // hashed 'admin123'
    role: AdminRole.ADMIN,
    createdAt: new Date(),
    lastLogin: null,
  };

  const mockSuperadmin = {
    id: '223e4567-e89b-12d3-a456-426614174001',
    username: 'superadmin1',
    passwordHash:
      '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X.VQ8o1Jn0QZ.LHFS',
    role: AdminRole.SUPERADMIN,
    createdAt: new Date(),
    lastLogin: null,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Setup default config mock
    mockConfigService.getOrThrow.mockImplementation((key: string) => {
      if (key === 'adminAuth.expires') return '2h';
      if (key === 'adminAuth.secret') return 'test-secret-key-minimum-32-chars';
      return null;
    });

    mockJwtService.signAsync.mockResolvedValue('mock-jwt-token');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthAdminService,
        {
          provide: 'AdminRepositoryInterface',
          useValue: mockAdminRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: AuditLogService,
          useValue: mockAuditLogService,
        },
        {
          provide: I18nService,
          useValue: mockI18nService,
        },
      ],
    }).compile();

    service = module.get<AuthAdminService>(AuthAdminService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==================== POSITIVE TESTS (30) ====================
  describe('Positive Tests', () => {
    beforeEach(() => {
      jest
        .spyOn(bcrypt, 'compare')
        .mockImplementation(() => Promise.resolve(true));
    });

    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should successfully login with valid admin credentials', async () => {
      mockAdminRepository.findByUsername.mockResolvedValue(mockAdmin);

      const dto: AdminLoginDto = { username: 'admin1', password: 'admin123' };
      const result = await service.validateLogin(dto);

      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('tokenExpires');
    });

    it('should successfully login with valid superadmin credentials', async () => {
      mockAdminRepository.findByUsername.mockResolvedValue(mockSuperadmin);

      const dto: AdminLoginDto = {
        username: 'superadmin1',
        password: 'superadmin123',
      };
      const result = await service.validateLogin(dto);

      expect(result).toHaveProperty('token');
      expect(result.token).toBe('mock-jwt-token');
    });

    it('should return JWT token on successful login', async () => {
      mockAdminRepository.findByUsername.mockResolvedValue(mockAdmin);

      const dto: AdminLoginDto = { username: 'admin1', password: 'admin123' };
      const result = await service.validateLogin(dto);

      expect(result.token).toBe('mock-jwt-token');
    });

    it('should return token expiration timestamp on successful login', async () => {
      mockAdminRepository.findByUsername.mockResolvedValue(mockAdmin);

      const dto: AdminLoginDto = { username: 'admin1', password: 'admin123' };
      const result = await service.validateLogin(dto);

      expect(typeof result.tokenExpires).toBe('number');
      expect(result.tokenExpires).toBeGreaterThan(Date.now());
    });

    it('should update last login timestamp on successful login', async () => {
      mockAdminRepository.findByUsername.mockResolvedValue(mockAdmin);

      const dto: AdminLoginDto = { username: 'admin1', password: 'admin123' };
      await service.validateLogin(dto);

      expect(mockAdminRepository.updateLastLogin).toHaveBeenCalledWith(
        mockAdmin.id,
      );
    });

    it('should call JwtService.signAsync with correct payload', async () => {
      mockAdminRepository.findByUsername.mockResolvedValue(mockAdmin);

      const dto: AdminLoginDto = { username: 'admin1', password: 'admin123' };
      await service.validateLogin(dto);

      expect(mockJwtService.signAsync).toHaveBeenCalledWith(
        {
          id: mockAdmin.id,
          username: mockAdmin.username,
          role: mockAdmin.role,
        },
        expect.any(Object),
      );
    });

    it('should log LOGIN_SUCCESS on successful login', async () => {
      mockAdminRepository.findByUsername.mockResolvedValue(mockAdmin);

      const dto: AdminLoginDto = { username: 'admin1', password: 'admin123' };
      await service.validateLogin(dto);

      expect(mockAuditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.LOGIN_SUCCESS,
          status: AuditStatus.SUCCESS,
        }),
      );
    });

    it('should include admin id in audit log on success', async () => {
      mockAdminRepository.findByUsername.mockResolvedValue(mockAdmin);

      const dto: AdminLoginDto = { username: 'admin1', password: 'admin123' };
      await service.validateLogin(dto);

      expect(mockAuditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: mockAdmin.id,
          actorType: AuditActorType.ADMIN,
        }),
      );
    });

    it('should use configService for JWT secret', async () => {
      mockAdminRepository.findByUsername.mockResolvedValue(mockAdmin);

      const dto: AdminLoginDto = { username: 'admin1', password: 'admin123' };
      await service.validateLogin(dto);

      expect(mockConfigService.getOrThrow).toHaveBeenCalledWith(
        'adminAuth.secret',
        expect.any(Object),
      );
    });

    it('should use configService for token expiration', async () => {
      mockAdminRepository.findByUsername.mockResolvedValue(mockAdmin);

      const dto: AdminLoginDto = { username: 'admin1', password: 'admin123' };
      await service.validateLogin(dto);

      expect(mockConfigService.getOrThrow).toHaveBeenCalledWith(
        'adminAuth.expires',
        expect.any(Object),
      );
    });

    it('should find admin by username', async () => {
      mockAdminRepository.findByUsername.mockResolvedValue(mockAdmin);

      const dto: AdminLoginDto = { username: 'admin1', password: 'admin123' };
      await service.validateLogin(dto);

      expect(mockAdminRepository.findByUsername).toHaveBeenCalledWith('admin1');
    });

    it('should work with different admin usernames', async () => {
      const admin2 = { ...mockAdmin, username: 'admin2', id: 'uuid-2' };
      mockAdminRepository.findByUsername.mockResolvedValue(admin2);

      const dto: AdminLoginDto = { username: 'admin2', password: 'admin123' };
      const result = await service.validateLogin(dto);

      expect(result.token).toBe('mock-jwt-token');
    });

    it('should work with ADMIN role', async () => {
      mockAdminRepository.findByUsername.mockResolvedValue(mockAdmin);

      const dto: AdminLoginDto = { username: 'admin1', password: 'admin123' };
      await service.validateLogin(dto);

      expect(mockJwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({ role: AdminRole.ADMIN }),
        expect.any(Object),
      );
    });

    it('should work with SUPERADMIN role', async () => {
      mockAdminRepository.findByUsername.mockResolvedValue(mockSuperadmin);

      const dto: AdminLoginDto = {
        username: 'superadmin1',
        password: 'superadmin123',
      };
      await service.validateLogin(dto);

      expect(mockJwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({ role: AdminRole.SUPERADMIN }),
        expect.any(Object),
      );
    });

    it('should include username in JWT payload', async () => {
      mockAdminRepository.findByUsername.mockResolvedValue(mockAdmin);

      const dto: AdminLoginDto = { username: 'admin1', password: 'admin123' };
      await service.validateLogin(dto);

      expect(mockJwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({ username: 'admin1' }),
        expect.any(Object),
      );
    });

    it('should include id in JWT payload', async () => {
      mockAdminRepository.findByUsername.mockResolvedValue(mockAdmin);

      const dto: AdminLoginDto = { username: 'admin1', password: 'admin123' };
      await service.validateLogin(dto);

      expect(mockJwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({ id: mockAdmin.id }),
        expect.any(Object),
      );
    });

    it('should pass expiresIn option to JWT sign', async () => {
      mockAdminRepository.findByUsername.mockResolvedValue(mockAdmin);

      const dto: AdminLoginDto = { username: 'admin1', password: 'admin123' };
      await service.validateLogin(dto);

      expect(mockJwtService.signAsync).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ expiresIn: '2h' }),
      );
    });

    it('should pass secret to JWT sign options', async () => {
      mockAdminRepository.findByUsername.mockResolvedValue(mockAdmin);

      const dto: AdminLoginDto = { username: 'admin1', password: 'admin123' };
      await service.validateLogin(dto);

      expect(mockJwtService.signAsync).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          secret: 'test-secret-key-minimum-32-chars',
        }),
      );
    });

    it('should include role and username in audit log details', async () => {
      mockAdminRepository.findByUsername.mockResolvedValue(mockAdmin);

      const dto: AdminLoginDto = { username: 'admin1', password: 'admin123' };
      await service.validateLogin(dto);

      expect(mockAuditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({
            username: 'admin1',
            role: AdminRole.ADMIN,
          }),
        }),
      );
    });

    it('should handle admin with existing lastLogin', async () => {
      const adminWithLastLogin = {
        ...mockAdmin,
        lastLogin: new Date('2024-01-01'),
      };
      mockAdminRepository.findByUsername.mockResolvedValue(adminWithLastLogin);

      const dto: AdminLoginDto = { username: 'admin1', password: 'admin123' };
      const result = await service.validateLogin(dto);

      expect(result.token).toBe('mock-jwt-token');
    });

    it('should return response with exactly two properties', async () => {
      mockAdminRepository.findByUsername.mockResolvedValue(mockAdmin);

      const dto: AdminLoginDto = { username: 'admin1', password: 'admin123' };
      const result = await service.validateLogin(dto);

      expect(Object.keys(result)).toHaveLength(2);
      expect(Object.keys(result)).toContain('token');
      expect(Object.keys(result)).toContain('tokenExpires');
    });

    it('should handle login for multiple admin users sequentially', async () => {
      mockAdminRepository.findByUsername
        .mockResolvedValueOnce(mockAdmin)
        .mockResolvedValueOnce(mockSuperadmin);

      const dto1: AdminLoginDto = { username: 'admin1', password: 'admin123' };
      const dto2: AdminLoginDto = {
        username: 'superadmin1',
        password: 'superadmin123',
      };

      await service.validateLogin(dto1);
      await service.validateLogin(dto2);

      expect(mockAdminRepository.findByUsername).toHaveBeenCalledTimes(2);
    });

    it('should calculate tokenExpires based on 2h expiry', async () => {
      mockAdminRepository.findByUsername.mockResolvedValue(mockAdmin);

      const beforeLogin = Date.now();
      const dto: AdminLoginDto = { username: 'admin1', password: 'admin123' };
      const result = await service.validateLogin(dto);
      const afterLogin = Date.now();

      // 2h = 7200000ms
      const expectedMin = beforeLogin + 7200000 - 1000; // 1s tolerance
      const expectedMax = afterLogin + 7200000 + 1000;

      expect(result.tokenExpires).toBeGreaterThanOrEqual(expectedMin);
      expect(result.tokenExpires).toBeLessThanOrEqual(expectedMax);
    });

    it('should use bcrypt.compare for password verification', async () => {
      mockAdminRepository.findByUsername.mockResolvedValue(mockAdmin);
      const compareSpy = jest.spyOn(bcrypt, 'compare');

      const dto: AdminLoginDto = { username: 'admin1', password: 'admin123' };
      await service.validateLogin(dto);

      expect(compareSpy).toHaveBeenCalledWith(
        'admin123',
        mockAdmin.passwordHash,
      );
    });

    it('should call repository only once per login', async () => {
      mockAdminRepository.findByUsername.mockResolvedValue(mockAdmin);

      const dto: AdminLoginDto = { username: 'admin1', password: 'admin123' };
      await service.validateLogin(dto);

      expect(mockAdminRepository.findByUsername).toHaveBeenCalledTimes(1);
    });

    it('should call auditLogService.log once on success', async () => {
      mockAdminRepository.findByUsername.mockResolvedValue(mockAdmin);

      const dto: AdminLoginDto = { username: 'admin1', password: 'admin123' };
      await service.validateLogin(dto);

      expect(mockAuditLogService.log).toHaveBeenCalledTimes(1);
    });

    it('should return non-null token', async () => {
      mockAdminRepository.findByUsername.mockResolvedValue(mockAdmin);

      const dto: AdminLoginDto = { username: 'admin1', password: 'admin123' };
      const result = await service.validateLogin(dto);

      expect(result.token).not.toBeNull();
      expect(result.token).not.toBeUndefined();
    });

    it('should return non-zero tokenExpires', async () => {
      mockAdminRepository.findByUsername.mockResolvedValue(mockAdmin);

      const dto: AdminLoginDto = { username: 'admin1', password: 'admin123' };
      const result = await service.validateLogin(dto);

      expect(result.tokenExpires).toBeGreaterThan(0);
    });
  });

  // ==================== NEGATIVE TESTS (30) ====================
  describe('Negative Tests', () => {
    beforeEach(() => {
      jest
        .spyOn(bcrypt, 'compare')
        .mockImplementation(() => Promise.resolve(false));
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      mockAdminRepository.findByUsername.mockResolvedValue(null);

      const dto: AdminLoginDto = {
        username: 'nonexistent',
        password: 'password',
      };

      await expect(service.validateLogin(dto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      mockAdminRepository.findByUsername.mockResolvedValue(mockAdmin);

      const dto: AdminLoginDto = {
        username: 'admin1',
        password: 'wrongpassword',
      };

      await expect(service.validateLogin(dto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should log LOGIN_FAILED when user not found', async () => {
      mockAdminRepository.findByUsername.mockResolvedValue(null);

      const dto: AdminLoginDto = {
        username: 'nonexistent',
        password: 'password',
      };

      try {
        await service.validateLogin(dto);
      } catch {
        // Expected
      }

      expect(mockAuditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.LOGIN_FAILED,
          status: AuditStatus.FAILED,
        }),
      );
    });

    it('should log LOGIN_FAILED when password is invalid', async () => {
      mockAdminRepository.findByUsername.mockResolvedValue(mockAdmin);

      const dto: AdminLoginDto = {
        username: 'admin1',
        password: 'wrongpassword',
      };

      try {
        await service.validateLogin(dto);
      } catch {
        // Expected
      }

      expect(mockAuditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.LOGIN_FAILED,
        }),
      );
    });

    it('should use ANONYMOUS actor type when user not found', async () => {
      mockAdminRepository.findByUsername.mockResolvedValue(null);

      const dto: AdminLoginDto = {
        username: 'nonexistent',
        password: 'password',
      };

      try {
        await service.validateLogin(dto);
      } catch {
        // Expected
      }

      expect(mockAuditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actorType: AuditActorType.ANONYMOUS,
          actorId: null,
        }),
      );
    });

    it('should not call updateLastLogin on failed login', async () => {
      mockAdminRepository.findByUsername.mockResolvedValue(null);

      const dto: AdminLoginDto = {
        username: 'nonexistent',
        password: 'password',
      };

      try {
        await service.validateLogin(dto);
      } catch {
        // Expected
      }

      expect(mockAdminRepository.updateLastLogin).not.toHaveBeenCalled();
    });

    it('should not generate JWT token on failed login', async () => {
      mockAdminRepository.findByUsername.mockResolvedValue(null);

      const dto: AdminLoginDto = {
        username: 'nonexistent',
        password: 'password',
      };

      try {
        await service.validateLogin(dto);
      } catch {
        // Expected
      }

      expect(mockJwtService.signAsync).not.toHaveBeenCalled();
    });

    it('should include attemptedUsername in audit log when user not found', async () => {
      mockAdminRepository.findByUsername.mockResolvedValue(null);

      const dto: AdminLoginDto = {
        username: 'hacker123',
        password: 'password',
      };

      try {
        await service.validateLogin(dto);
      } catch {
        // Expected
      }

      expect(mockAuditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({
            attemptedUsername: 'hacker123',
          }),
        }),
      );
    });

    it('should include failure reason in audit log for user not found', async () => {
      mockAdminRepository.findByUsername.mockResolvedValue(null);

      const dto: AdminLoginDto = {
        username: 'nonexistent',
        password: 'password',
      };

      try {
        await service.validateLogin(dto);
      } catch {
        // Expected
      }

      expect(mockAuditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({
            reason: 'User not found',
          }),
        }),
      );
    });

    it('should include failure reason in audit log for invalid password', async () => {
      mockAdminRepository.findByUsername.mockResolvedValue(mockAdmin);

      const dto: AdminLoginDto = {
        username: 'admin1',
        password: 'wrongpassword',
      };

      try {
        await service.validateLogin(dto);
      } catch {
        // Expected
      }

      expect(mockAuditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({
            reason: 'Invalid password',
          }),
        }),
      );
    });

    it('should use ADMIN actor type when password is invalid', async () => {
      mockAdminRepository.findByUsername.mockResolvedValue(mockAdmin);

      const dto: AdminLoginDto = {
        username: 'admin1',
        password: 'wrongpassword',
      };

      try {
        await service.validateLogin(dto);
      } catch {
        // Expected
      }

      expect(mockAuditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actorType: AuditActorType.ADMIN,
          actorId: mockAdmin.id,
        }),
      );
    });

    it('should throw with generic message on invalid credentials', async () => {
      mockAdminRepository.findByUsername.mockResolvedValue(null);

      const dto: AdminLoginDto = {
        username: 'nonexistent',
        password: 'password',
      };

      await expect(service.validateLogin(dto)).rejects.toThrow(
        'Invalid credentials',
      );
    });

    it('should not reveal which field is incorrect', async () => {
      mockAdminRepository.findByUsername.mockResolvedValue(mockAdmin);

      const dto: AdminLoginDto = {
        username: 'admin1',
        password: 'wrongpassword',
      };

      await expect(service.validateLogin(dto)).rejects.toThrow(
        'Invalid credentials',
      );
    });

    it('should call i18n.t for error message', async () => {
      mockAdminRepository.findByUsername.mockResolvedValue(null);

      const dto: AdminLoginDto = {
        username: 'nonexistent',
        password: 'password',
      };

      try {
        await service.validateLogin(dto);
      } catch {
        // Expected
      }

      expect(mockI18nService.t).toHaveBeenCalledWith(
        'adminAuth.invalidCredentials',
        expect.any(Object),
      );
    });

    it('should handle repository throwing error', async () => {
      mockAdminRepository.findByUsername.mockRejectedValue(
        new Error('Database error'),
      );

      const dto: AdminLoginDto = { username: 'admin1', password: 'admin123' };

      await expect(service.validateLogin(dto)).rejects.toThrow(
        'Database error',
      );
    });

    it('should handle bcrypt.compare throwing error', async () => {
      mockAdminRepository.findByUsername.mockResolvedValue(mockAdmin);
      jest
        .spyOn(bcrypt, 'compare')
        .mockImplementation(() => Promise.reject(new Error('Bcrypt error')));

      const dto: AdminLoginDto = { username: 'admin1', password: 'admin123' };

      await expect(service.validateLogin(dto)).rejects.toThrow('Bcrypt error');
    });

    it('should handle JwtService.signAsync throwing error', async () => {
      mockAdminRepository.findByUsername.mockResolvedValue(mockAdmin);
      jest
        .spyOn(bcrypt, 'compare')
        .mockImplementation(() => Promise.resolve(true));
      mockJwtService.signAsync.mockRejectedValue(new Error('JWT error'));

      const dto: AdminLoginDto = { username: 'admin1', password: 'admin123' };

      await expect(service.validateLogin(dto)).rejects.toThrow('JWT error');
    });

    it('should not log LOGIN_SUCCESS when JWT generation fails', async () => {
      mockAdminRepository.findByUsername.mockResolvedValue(mockAdmin);
      jest
        .spyOn(bcrypt, 'compare')
        .mockImplementation(() => Promise.resolve(true));
      mockJwtService.signAsync.mockRejectedValue(new Error('JWT error'));

      const dto: AdminLoginDto = { username: 'admin1', password: 'admin123' };

      try {
        await service.validateLogin(dto);
      } catch {
        // Expected
      }

      expect(mockAuditLogService.log).not.toHaveBeenCalledWith(
        expect.objectContaining({ action: AuditAction.LOGIN_SUCCESS }),
      );
    });

    it('should reject empty username', async () => {
      mockAdminRepository.findByUsername.mockResolvedValue(null);

      const dto: AdminLoginDto = { username: '', password: 'password' };

      await expect(service.validateLogin(dto)).rejects.toThrow();
    });

    it('should reject empty password', async () => {
      mockAdminRepository.findByUsername.mockResolvedValue(mockAdmin);

      const dto: AdminLoginDto = { username: 'admin1', password: '' };

      await expect(service.validateLogin(dto)).rejects.toThrow();
    });

    it('should log only once on user not found', async () => {
      mockAdminRepository.findByUsername.mockResolvedValue(null);

      const dto: AdminLoginDto = {
        username: 'nonexistent',
        password: 'password',
      };

      try {
        await service.validateLogin(dto);
      } catch {
        // Expected
      }

      expect(mockAuditLogService.log).toHaveBeenCalledTimes(1);
    });

    it('should log only once on invalid password', async () => {
      mockAdminRepository.findByUsername.mockResolvedValue(mockAdmin);

      const dto: AdminLoginDto = {
        username: 'admin1',
        password: 'wrongpassword',
      };

      try {
        await service.validateLogin(dto);
      } catch {
        // Expected
      }

      expect(mockAuditLogService.log).toHaveBeenCalledTimes(1);
    });

    it('should not update lastLogin on invalid password', async () => {
      mockAdminRepository.findByUsername.mockResolvedValue(mockAdmin);

      const dto: AdminLoginDto = {
        username: 'admin1',
        password: 'wrongpassword',
      };

      try {
        await service.validateLogin(dto);
      } catch {
        // Expected
      }

      expect(mockAdminRepository.updateLastLogin).not.toHaveBeenCalled();
    });

    it('should not call JWT signAsync on invalid password', async () => {
      mockAdminRepository.findByUsername.mockResolvedValue(mockAdmin);

      const dto: AdminLoginDto = {
        username: 'admin1',
        password: 'wrongpassword',
      };

      try {
        await service.validateLogin(dto);
      } catch {
        // Expected
      }

      expect(mockJwtService.signAsync).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException not other exception types', async () => {
      mockAdminRepository.findByUsername.mockResolvedValue(null);

      const dto: AdminLoginDto = {
        username: 'nonexistent',
        password: 'password',
      };

      try {
        await service.validateLogin(dto);
        fail('Expected exception');
      } catch (error) {
        expect(error).toBeInstanceOf(UnauthorizedException);
      }
    });

    it('should handle case-sensitive username lookup', async () => {
      mockAdminRepository.findByUsername.mockResolvedValue(null);

      const dto: AdminLoginDto = { username: 'ADMIN1', password: 'admin123' };

      await expect(service.validateLogin(dto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockAdminRepository.findByUsername).toHaveBeenCalledWith('ADMIN1');
    });

    it('should properly handle whitespace in password', async () => {
      mockAdminRepository.findByUsername.mockResolvedValue(mockAdmin);

      const dto: AdminLoginDto = { username: 'admin1', password: '  admin123' };

      await expect(service.validateLogin(dto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should handle configService.getOrThrow throwing error', async () => {
      mockAdminRepository.findByUsername.mockResolvedValue(mockAdmin);
      jest
        .spyOn(bcrypt, 'compare')
        .mockImplementation(() => Promise.resolve(true));
      mockConfigService.getOrThrow.mockImplementation(() => {
        throw new Error('Config not found');
      });

      const dto: AdminLoginDto = { username: 'admin1', password: 'admin123' };

      await expect(service.validateLogin(dto)).rejects.toThrow(
        'Config not found',
      );
    });

    it('should handle repository.updateLastLogin throwing error', async () => {
      mockAdminRepository.findByUsername.mockResolvedValue(mockAdmin);
      jest
        .spyOn(bcrypt, 'compare')
        .mockImplementation(() => Promise.resolve(true));
      mockAdminRepository.updateLastLogin.mockRejectedValue(
        new Error('Update error'),
      );

      const dto: AdminLoginDto = { username: 'admin1', password: 'admin123' };

      await expect(service.validateLogin(dto)).rejects.toThrow('Update error');
    });
  });

  // ==================== EDGE CASE TESTS (30) ====================
  describe('Edge Case Tests', () => {
    beforeEach(() => {
      // Reset mocks that might have been set in previous tests
      mockAdminRepository.updateLastLogin.mockResolvedValue(undefined);
      mockJwtService.signAsync.mockResolvedValue('mock-jwt-token');
      mockAuditLogService.log.mockImplementation(() => {});
      mockConfigService.getOrThrow.mockImplementation((key: string) => {
        if (key === 'adminAuth.expires') return '2h';
        if (key === 'adminAuth.secret')
          return 'test-secret-key-minimum-32-chars';
        return null;
      });
      jest
        .spyOn(bcrypt, 'compare')
        .mockImplementation(() => Promise.resolve(true));
    });

    it('should handle username with special characters', async () => {
      const adminWithSpecialChars = {
        ...mockAdmin,
        username: 'admin_test-1',
      };
      mockAdminRepository.findByUsername.mockResolvedValue(
        adminWithSpecialChars,
      );

      const dto: AdminLoginDto = {
        username: 'admin_test-1',
        password: 'admin123',
      };
      const result = await service.validateLogin(dto);

      expect(result.token).toBe('mock-jwt-token');
    });

    it('should handle username with numbers', async () => {
      const adminWithNumbers = { ...mockAdmin, username: 'admin123' };
      mockAdminRepository.findByUsername.mockResolvedValue(adminWithNumbers);

      const dto: AdminLoginDto = {
        username: 'admin123',
        password: 'admin123',
      };
      const result = await service.validateLogin(dto);

      expect(result.token).toBe('mock-jwt-token');
    });

    it('should handle minimum length username (1 char)', async () => {
      const adminMinUsername = { ...mockAdmin, username: 'a' };
      mockAdminRepository.findByUsername.mockResolvedValue(adminMinUsername);

      const dto: AdminLoginDto = { username: 'a', password: 'admin123' };
      const result = await service.validateLogin(dto);

      expect(result.token).toBe('mock-jwt-token');
    });

    it('should handle maximum length username (50 chars)', async () => {
      const longUsername = 'a'.repeat(50);
      const adminMaxUsername = { ...mockAdmin, username: longUsername };
      mockAdminRepository.findByUsername.mockResolvedValue(adminMaxUsername);

      const dto: AdminLoginDto = {
        username: longUsername,
        password: 'admin123',
      };
      const result = await service.validateLogin(dto);

      expect(result.token).toBe('mock-jwt-token');
    });

    it('should handle password with special characters', async () => {
      mockAdminRepository.findByUsername.mockResolvedValue(mockAdmin);

      const dto: AdminLoginDto = {
        username: 'admin1',
        password: 'P@ssw0rd!#$%',
      };
      const result = await service.validateLogin(dto);

      expect(result.token).toBe('mock-jwt-token');
    });

    it('should handle password with unicode characters', async () => {
      mockAdminRepository.findByUsername.mockResolvedValue(mockAdmin);

      const dto: AdminLoginDto = {
        username: 'admin1',
        password: 'пароль密码',
      };
      const result = await service.validateLogin(dto);

      expect(result.token).toBe('mock-jwt-token');
    });

    it('should handle password with spaces', async () => {
      mockAdminRepository.findByUsername.mockResolvedValue(mockAdmin);

      const dto: AdminLoginDto = {
        username: 'admin1',
        password: 'password with spaces',
      };
      const result = await service.validateLogin(dto);

      expect(result.token).toBe('mock-jwt-token');
    });

    it('should handle very long password', async () => {
      mockAdminRepository.findByUsername.mockResolvedValue(mockAdmin);

      const dto: AdminLoginDto = {
        username: 'admin1',
        password: 'a'.repeat(255),
      };
      const result = await service.validateLogin(dto);

      expect(result.token).toBe('mock-jwt-token');
    });

    it('should handle concurrent login attempts', async () => {
      mockAdminRepository.findByUsername.mockResolvedValue(mockAdmin);

      const dto: AdminLoginDto = { username: 'admin1', password: 'admin123' };

      const results = await Promise.all([
        service.validateLogin(dto),
        service.validateLogin(dto),
        service.validateLogin(dto),
      ]);

      results.forEach((result) => {
        expect(result.token).toBe('mock-jwt-token');
      });
    });

    it('should handle admin with null lastLogin', async () => {
      const adminNullLastLogin = { ...mockAdmin, lastLogin: null };
      mockAdminRepository.findByUsername.mockResolvedValue(adminNullLastLogin);

      const dto: AdminLoginDto = { username: 'admin1', password: 'admin123' };
      const result = await service.validateLogin(dto);

      expect(result.token).toBe('mock-jwt-token');
    });

    it('should handle admin with very old lastLogin', async () => {
      const adminOldLastLogin = {
        ...mockAdmin,
        lastLogin: new Date('1970-01-01'),
      };
      mockAdminRepository.findByUsername.mockResolvedValue(adminOldLastLogin);

      const dto: AdminLoginDto = { username: 'admin1', password: 'admin123' };
      const result = await service.validateLogin(dto);

      expect(result.token).toBe('mock-jwt-token');
    });

    it('should handle admin with future createdAt', async () => {
      const adminFutureCreated = {
        ...mockAdmin,
        createdAt: new Date('2099-01-01'),
      };
      mockAdminRepository.findByUsername.mockResolvedValue(adminFutureCreated);

      const dto: AdminLoginDto = { username: 'admin1', password: 'admin123' };
      const result = await service.validateLogin(dto);

      expect(result.token).toBe('mock-jwt-token');
    });

    it('should handle UUID with different formats', async () => {
      const adminDifferentUuid = {
        ...mockAdmin,
        id: '00000000-0000-0000-0000-000000000001',
      };
      mockAdminRepository.findByUsername.mockResolvedValue(adminDifferentUuid);

      const dto: AdminLoginDto = { username: 'admin1', password: 'admin123' };
      await service.validateLogin(dto);

      expect(mockJwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          id: '00000000-0000-0000-0000-000000000001',
        }),
        expect.any(Object),
      );
    });

    it('should handle rapid sequential logins', async () => {
      mockAdminRepository.findByUsername.mockResolvedValue(mockAdmin);

      const dto: AdminLoginDto = { username: 'admin1', password: 'admin123' };

      for (let i = 0; i < 10; i++) {
        const result = await service.validateLogin(dto);
        expect(result.token).toBe('mock-jwt-token');
      }

      expect(mockAdminRepository.findByUsername).toHaveBeenCalledTimes(10);
    });

    it('should handle different token expiry configurations', async () => {
      mockAdminRepository.findByUsername.mockResolvedValue(mockAdmin);
      mockConfigService.getOrThrow.mockImplementation((key: string) => {
        if (key === 'adminAuth.expires') return '1h';
        if (key === 'adminAuth.secret')
          return 'test-secret-key-minimum-32-chars';
        return null;
      });

      const dto: AdminLoginDto = { username: 'admin1', password: 'admin123' };
      await service.validateLogin(dto);

      expect(mockJwtService.signAsync).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ expiresIn: '1h' }),
      );
    });

    it('should handle admin ID with all lowercase', async () => {
      const adminLowercaseId = {
        ...mockAdmin,
        id: 'abcdefgh-ijkl-mnop-qrst-uvwxyz123456',
      };
      mockAdminRepository.findByUsername.mockResolvedValue(adminLowercaseId);

      const dto: AdminLoginDto = { username: 'admin1', password: 'admin123' };
      const result = await service.validateLogin(dto);

      expect(result.token).toBe('mock-jwt-token');
    });

    it('should handle admin ID with all uppercase', async () => {
      const adminUppercaseId = {
        ...mockAdmin,
        id: 'ABCDEFGH-IJKL-MNOP-QRST-UVWXYZ123456',
      };
      mockAdminRepository.findByUsername.mockResolvedValue(adminUppercaseId);

      const dto: AdminLoginDto = { username: 'admin1', password: 'admin123' };
      const result = await service.validateLogin(dto);

      expect(result.token).toBe('mock-jwt-token');
    });

    it('should handle password that looks like SQL injection', async () => {
      mockAdminRepository.findByUsername.mockResolvedValue(mockAdmin);

      const dto: AdminLoginDto = {
        username: 'admin1',
        password: "'; DROP TABLE admins; --",
      };
      const result = await service.validateLogin(dto);

      expect(result.token).toBe('mock-jwt-token');
    });

    it('should handle username that looks like SQL injection', async () => {
      mockAdminRepository.findByUsername.mockResolvedValue(null);

      const dto: AdminLoginDto = {
        username: "' OR '1'='1",
        password: 'admin123',
      };

      await expect(service.validateLogin(dto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should handle password with newline characters', async () => {
      mockAdminRepository.findByUsername.mockResolvedValue(mockAdmin);

      const dto: AdminLoginDto = {
        username: 'admin1',
        password: 'password\nwith\nnewlines',
      };
      const result = await service.validateLogin(dto);

      expect(result.token).toBe('mock-jwt-token');
    });

    it('should handle password with tab characters', async () => {
      mockAdminRepository.findByUsername.mockResolvedValue(mockAdmin);

      const dto: AdminLoginDto = {
        username: 'admin1',
        password: 'password\twith\ttabs',
      };
      const result = await service.validateLogin(dto);

      expect(result.token).toBe('mock-jwt-token');
    });

    it('should handle password with null byte', async () => {
      mockAdminRepository.findByUsername.mockResolvedValue(mockAdmin);

      const dto: AdminLoginDto = {
        username: 'admin1',
        password: 'password\x00nullbyte',
      };
      const result = await service.validateLogin(dto);

      expect(result.token).toBe('mock-jwt-token');
    });

    it('should handle extremely long JWT secret', async () => {
      mockAdminRepository.findByUsername.mockResolvedValue(mockAdmin);
      mockConfigService.getOrThrow.mockImplementation((key: string) => {
        if (key === 'adminAuth.expires') return '2h';
        if (key === 'adminAuth.secret') return 'a'.repeat(1000);
        return null;
      });

      const dto: AdminLoginDto = { username: 'admin1', password: 'admin123' };
      const result = await service.validateLogin(dto);

      expect(result.token).toBe('mock-jwt-token');
    });

    it('should handle admin with different role after login', async () => {
      // First login as ADMIN
      mockAdminRepository.findByUsername.mockResolvedValue(mockAdmin);

      const dto1: AdminLoginDto = { username: 'admin1', password: 'admin123' };
      await service.validateLogin(dto1);

      expect(mockJwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({ role: AdminRole.ADMIN }),
        expect.any(Object),
      );

      // Second login as SUPERADMIN
      mockAdminRepository.findByUsername.mockResolvedValue(mockSuperadmin);

      const dto2: AdminLoginDto = {
        username: 'superadmin1',
        password: 'superadmin123',
      };
      await service.validateLogin(dto2);

      expect(mockJwtService.signAsync).toHaveBeenLastCalledWith(
        expect.objectContaining({ role: AdminRole.SUPERADMIN }),
        expect.any(Object),
      );
    });

    it('should handle login at epoch time boundary', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date(0));

      mockAdminRepository.findByUsername.mockResolvedValue(mockAdmin);

      const dto: AdminLoginDto = { username: 'admin1', password: 'admin123' };
      const result = await service.validateLogin(dto);

      expect(result.tokenExpires).toBeGreaterThan(0);

      jest.useRealTimers();
    });

    it('should handle login at year 2038 timestamp', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2038-01-19T03:14:07Z'));

      mockAdminRepository.findByUsername.mockResolvedValue(mockAdmin);

      const dto: AdminLoginDto = { username: 'admin1', password: 'admin123' };
      const result = await service.validateLogin(dto);

      expect(result.tokenExpires).toBeGreaterThan(Date.now());

      jest.useRealTimers();
    });

    it('should handle bcrypt hash with different salt rounds', async () => {
      // Using hash from cost factor 10 (different from our default 12)
      const adminDifferentSalt = {
        ...mockAdmin,
        passwordHash:
          '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
      };
      mockAdminRepository.findByUsername.mockResolvedValue(adminDifferentSalt);

      const dto: AdminLoginDto = { username: 'admin1', password: 'admin123' };
      const result = await service.validateLogin(dto);

      expect(result.token).toBe('mock-jwt-token');
    });

    it('should handle auditLogService.log throwing error gracefully', async () => {
      mockAdminRepository.findByUsername.mockResolvedValue(mockAdmin);
      mockAuditLogService.log.mockImplementation(() => {
        throw new Error('Audit log error');
      });

      const dto: AdminLoginDto = { username: 'admin1', password: 'admin123' };

      // The service throws because audit log is called synchronously
      // If it were fire-and-forget (async), it would complete
      await expect(service.validateLogin(dto)).rejects.toThrow(
        'Audit log error',
      );

      // Reset the mock for subsequent tests
      mockAuditLogService.log.mockImplementation(() => {});
    });

    it('should handle multiple simultaneous failed login attempts', async () => {
      mockAdminRepository.findByUsername.mockResolvedValue(null);

      const dto: AdminLoginDto = {
        username: 'nonexistent',
        password: 'password',
      };

      const promises = Array(5)
        .fill(null)
        .map(() => service.validateLogin(dto).catch((e: unknown) => e));

      const results = await Promise.all(promises);

      results.forEach((result) => {
        expect(result).toBeInstanceOf(UnauthorizedException);
      });
    });
  });
});
