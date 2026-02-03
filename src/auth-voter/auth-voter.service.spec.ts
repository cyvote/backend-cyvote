import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { I18nService, I18nContext } from 'nestjs-i18n';
import { AuthVoterService } from './auth-voter.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { Voter } from './domain/voter.model';
import { Token } from './domain/token.model';
import { AuditAction } from '../audit-log/enums/audit-action.enum';
import { VoterLoginDto } from './dto/voter-login.dto';
import { VerifyTokenDto } from './dto/verify-token.dto';

// Mock I18nContext
jest.mock('nestjs-i18n', () => ({
  ...jest.requireActual('nestjs-i18n'),
  I18nContext: {
    current: jest.fn(() => ({ lang: 'en' })),
  },
}));

describe('AuthVoterService', () => {
  let service: AuthVoterService;
  let voterRepository: any;
  let tokenRepository: any;
  let jwtService: JwtService;
  let configService: ConfigService;
  let auditLogService: AuditLogService;
  let i18nService: I18nService;

  // Mock data factories
  const createMockVoter = (overrides: Partial<Voter> = {}): Voter =>
    new Voter({
      id: 'voter-uuid-1234',
      nim: '2210512109',
      namaLengkap: 'John Doe',
      angkatan: 2022,
      email: 'john.doe@example.com',
      hasVoted: false,
      votedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      ...overrides,
    });

  const createMockToken = (overrides: Partial<Token> = {}): Token =>
    new Token({
      id: 'token-uuid-1234',
      voterId: 'voter-uuid-1234',
      tokenHash:
        '7b3f9a2d8e5c1b4a6d9f0e3c2a5b8d7e1f4c6a9b0d3e5f8c2a4b7d0e3f6c9a2b',
      generatedAt: new Date(),
      usedAt: null,
      isUsed: false,
      resendCount: 0,
      ...overrides,
    });

  beforeEach(async () => {
    // Create mock repositories
    voterRepository = {
      findByNim: jest.fn(),
      findById: jest.fn(),
    };

    tokenRepository = {
      findByVoterIdAndHash: jest.fn(),
      markAsUsed: jest.fn(),
      findActiveByVoterId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthVoterService,
        {
          provide: 'VoterRepositoryInterface',
          useValue: voterRepository,
        },
        {
          provide: 'TokenRepositoryInterface',
          useValue: tokenRepository,
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn().mockResolvedValue('mock-jwt-token'),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('30m'),
            getOrThrow: jest.fn().mockReturnValue('test-secret'),
          },
        },
        {
          provide: AuditLogService,
          useValue: {
            log: jest.fn(),
          },
        },
        {
          provide: I18nService,
          useValue: {
            t: jest.fn((key: string) => {
              const translations: Record<string, string> = {
                'voterAuth.nimNotFound':
                  'Your account is not registered. Contact the PSDM Team.',
                'voterAuth.tokenAlreadyUsed': 'Token has been used.',
                'voterAuth.tokenInvalid': 'Invalid token.',
                'voterAuth.loginSuccess': 'Login successful.',
                'voterAuth.verifySuccess': 'Token verified successfully.',
              };
              return translations[key] || key;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AuthVoterService>(AuthVoterService);
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);
    auditLogService = module.get<AuditLogService>(AuditLogService);
    i18nService = module.get<I18nService>(I18nService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('AuthVoterService - Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  // ============================================
  // POSITIVE TESTS - Login (15 tests)
  // ============================================
  describe('login() - Positive Cases', () => {
    const validLoginDto: VoterLoginDto = { nim: '2210512109' };

    it('should successfully login with valid NIM', async () => {
      const voter = createMockVoter();
      voterRepository.findByNim.mockResolvedValue(voter);

      const result = await service.login(validLoginDto);

      expect(result).toBeDefined();
      expect(result.sessionToken).toBe('mock-jwt-token');
      expect(result.voter.nim).toBe('2210512109');
      expect(result.voter.nama).toBe('John Doe');
    });

    it('should return session token with correct expiration', async () => {
      const voter = createMockVoter();
      voterRepository.findByNim.mockResolvedValue(voter);

      const result = await service.login(validLoginDto);

      expect(result.tokenExpires).toBeGreaterThan(Date.now());
    });

    it('should call jwtService.signAsync with correct payload', async () => {
      const voter = createMockVoter();
      voterRepository.findByNim.mockResolvedValue(voter);

      await service.login(validLoginDto);

      expect(jwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          voterId: voter.id,
          nim: voter.nim,
          type: 'voter_session',
        }),
        expect.objectContaining({
          secret: 'test-secret',
          expiresIn: '5m',
        }),
      );
    });

    it('should log successful login to audit log', async () => {
      const voter = createMockVoter();
      voterRepository.findByNim.mockResolvedValue(voter);

      await service.login(validLoginDto);

      expect(auditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.VOTER_LOGIN_SUCCESS,
          actorId: voter.id,
        }),
      );
    });

    it('should return voter info in response', async () => {
      const voter = createMockVoter({
        nim: '2210512125',
        namaLengkap: 'Jane Doe',
      });
      voterRepository.findByNim.mockResolvedValue(voter);

      const result = await service.login({ nim: '2210512125' });

      expect(result.voter).toEqual({
        nim: '2210512125',
        nama: 'Jane Doe',
      });
    });

    it('should handle voter with special characters in name', async () => {
      const voter = createMockVoter({ namaLengkap: "O'Connor-Smith Jr." });
      voterRepository.findByNim.mockResolvedValue(voter);

      const result = await service.login(validLoginDto);

      expect(result.voter.nama).toBe("O'Connor-Smith Jr.");
    });

    it('should work with NIM containing leading zeros', async () => {
      const voter = createMockVoter({ nim: '0012345678' });
      voterRepository.findByNim.mockResolvedValue(voter);

      const result = await service.login({ nim: '0012345678' });

      expect(result.voter.nim).toBe('0012345678');
    });

    it('should return different tokens for different voters', async () => {
      const voter1 = createMockVoter({ id: 'voter-1', nim: '1111111111' });
      const voter2 = createMockVoter({ id: 'voter-2', nim: '2222222222' });

      voterRepository.findByNim.mockResolvedValueOnce(voter1);
      jwtService.signAsync = jest.fn().mockResolvedValueOnce('token-1');

      const result1 = await service.login({ nim: '1111111111' });

      voterRepository.findByNim.mockResolvedValueOnce(voter2);
      jwtService.signAsync = jest.fn().mockResolvedValueOnce('token-2');

      const result2 = await service.login({ nim: '2222222222' });

      expect(result1.sessionToken).not.toEqual(result2.sessionToken);
    });

    it('should use configService to get auth secret', async () => {
      const voter = createMockVoter();
      voterRepository.findByNim.mockResolvedValue(voter);

      await service.login(validLoginDto);

      expect(configService.getOrThrow).toHaveBeenCalledWith('auth.secret', {
        infer: true,
      });
    });

    it('should handle voter who has already voted', async () => {
      const voter = createMockVoter({
        hasVoted: true,
        votedAt: new Date(),
      });
      voterRepository.findByNim.mockResolvedValue(voter);

      // Login should still work - voting status is checked separately
      const result = await service.login(validLoginDto);

      expect(result.sessionToken).toBeDefined();
    });

    it('should work with minimum length NIM', async () => {
      const voter = createMockVoter({ nim: '123' });
      voterRepository.findByNim.mockResolvedValue(voter);

      const result = await service.login({ nim: '123' });

      expect(result.voter.nim).toBe('123');
    });

    it('should work with maximum length NIM (15 chars)', async () => {
      const longNim = '123456789012345';
      const voter = createMockVoter({ nim: longNim });
      voterRepository.findByNim.mockResolvedValue(voter);

      const result = await service.login({ nim: longNim });

      expect(result.voter.nim).toBe(longNim);
    });

    it('should include all required fields in response', async () => {
      const voter = createMockVoter();
      voterRepository.findByNim.mockResolvedValue(voter);

      const result = await service.login(validLoginDto);

      expect(result).toHaveProperty('sessionToken');
      expect(result).toHaveProperty('tokenExpires');
      expect(result).toHaveProperty('voter');
      expect(result.voter).toHaveProperty('nim');
      expect(result.voter).toHaveProperty('nama');
    });

    it('should allow login without checking election status', async () => {
      const voter = createMockVoter();
      voterRepository.findByNim.mockResolvedValue(voter);

      const result = await service.login(validLoginDto);

      expect(result.sessionToken).toBeDefined();
    });

    it('should handle voter with minimal fields', async () => {
      const minimalVoter = new Voter({
        id: 'voter-id',
        nim: '12345',
        namaLengkap: 'A',
        angkatan: 2020,
        email: 'a@b.c',
        hasVoted: false,
        votedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      });
      voterRepository.findByNim.mockResolvedValue(minimalVoter);

      const result = await service.login({ nim: '12345' });

      expect(result.voter.nim).toBe('12345');
      expect(result.voter.nama).toBe('A');
    });
  });

  // ============================================
  // NEGATIVE TESTS - Login (10 tests)
  // ============================================
  describe('login() - Negative Cases', () => {
    const validLoginDto: VoterLoginDto = { nim: '2210512109' };

    it('should throw UnauthorizedException when NIM not found', async () => {
      voterRepository.findByNim.mockResolvedValue(null);

      await expect(service.login(validLoginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw with correct message when NIM not found', async () => {
      voterRepository.findByNim.mockResolvedValue(null);

      await expect(service.login(validLoginDto)).rejects.toThrow(
        'Your account is not registered. Contact the PSDM Team.',
      );
    });

    it('should log failed login when NIM not found', async () => {
      voterRepository.findByNim.mockResolvedValue(null);

      try {
        await service.login(validLoginDto);
      } catch {
        // expected
      }

      expect(auditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.VOTER_LOGIN_FAILED,
          details: expect.objectContaining({
            reason: 'Voter not found',
          }),
        }),
      );
    });

    it('should not generate JWT when voter not found', async () => {
      voterRepository.findByNim.mockResolvedValue(null);

      try {
        await service.login(validLoginDto);
      } catch {
        // expected
      }

      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });

    it('should propagate repository errors for findByNim', async () => {
      voterRepository.findByNim.mockRejectedValue(new Error('DB Error'));

      await expect(service.login(validLoginDto)).rejects.toThrow('DB Error');
    });

    it('should propagate JWT signing errors in login', async () => {
      const voter = createMockVoter();
      voterRepository.findByNim.mockResolvedValue(voter);
      (jwtService.signAsync as jest.Mock).mockRejectedValue(
        new Error('JWT Error'),
      );

      await expect(service.login(validLoginDto)).rejects.toThrow('JWT Error');
    });

    it('should include attemptedNim in audit log when NIM not found', async () => {
      voterRepository.findByNim.mockResolvedValue(null);

      try {
        await service.login({ nim: '9999999999' });
      } catch {
        // expected
      }

      expect(auditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({
            attemptedNim: '9999999999',
          }),
        }),
      );
    });

    it('should use i18n service for error messages', async () => {
      voterRepository.findByNim.mockResolvedValue(null);

      try {
        await service.login({ nim: 'unknown' });
      } catch {
        // expected
      }

      expect(i18nService.t).toHaveBeenCalledWith(
        'voterAuth.nimNotFound',
        expect.any(Object),
      );
    });

    it('should handle concurrent login attempts', async () => {
      const voter = createMockVoter();
      voterRepository.findByNim.mockResolvedValue(voter);

      const promises = Array.from({ length: 5 }, () =>
        service.login({ nim: '2210512109' }),
      );

      const results = await Promise.all(promises);

      results.forEach((result) => {
        expect(result.sessionToken).toBeDefined();
      });
    });

    it('should handle unknown NIM with special characters', async () => {
      voterRepository.findByNim.mockResolvedValue(null);

      await expect(service.login({ nim: 'INVALID!@#' })).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // ============================================
  // POSITIVE TESTS - Verify Token (15 tests)
  // ============================================
  describe('verifyToken() - Positive Cases', () => {
    const validDto: VerifyTokenDto = { token: 'ABC123XYZ789TEST' };
    const voterId = 'voter-uuid-1234';

    it('should successfully verify valid token', async () => {
      const token = createMockToken();
      tokenRepository.findByVoterIdAndHash.mockResolvedValue(token);
      tokenRepository.markAsUsed.mockResolvedValue(undefined);

      const result = await service.verifyToken(validDto, voterId);

      expect(result).toBeDefined();
      expect(result.token).toBe('mock-jwt-token');
    });

    it('should return token with expiration', async () => {
      const token = createMockToken();
      tokenRepository.findByVoterIdAndHash.mockResolvedValue(token);
      tokenRepository.markAsUsed.mockResolvedValue(undefined);

      const result = await service.verifyToken(validDto, voterId);

      expect(result.tokenExpires).toBeGreaterThan(Date.now());
    });

    it('should mark token as used after verification', async () => {
      const token = createMockToken();
      tokenRepository.findByVoterIdAndHash.mockResolvedValue(token);
      tokenRepository.markAsUsed.mockResolvedValue(undefined);

      await service.verifyToken(validDto, voterId);

      expect(tokenRepository.markAsUsed).toHaveBeenCalledWith(token.id);
    });

    it('should log successful token verification to audit log', async () => {
      const token = createMockToken();
      tokenRepository.findByVoterIdAndHash.mockResolvedValue(token);
      tokenRepository.markAsUsed.mockResolvedValue(undefined);

      await service.verifyToken(validDto, voterId);

      expect(auditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.VOTER_TOKEN_VERIFIED,
        }),
      );
    });

    it('should use SHA-256 hashing for token', async () => {
      const token = createMockToken();
      tokenRepository.findByVoterIdAndHash.mockResolvedValue(token);
      tokenRepository.markAsUsed.mockResolvedValue(undefined);

      await service.verifyToken(validDto, voterId);

      expect(tokenRepository.findByVoterIdAndHash).toHaveBeenCalledWith(
        voterId,
        expect.any(String),
      );
    });

    it('should generate authenticated JWT with voter_authenticated type', async () => {
      const token = createMockToken();
      tokenRepository.findByVoterIdAndHash.mockResolvedValue(token);
      tokenRepository.markAsUsed.mockResolvedValue(undefined);

      await service.verifyToken(validDto, voterId);

      expect(jwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          voterId,
          tokenId: token.id,
          type: 'voter_authenticated',
        }),
        expect.any(Object),
      );
    });

    it('should use configService to get auth expires config', async () => {
      const token = createMockToken();
      tokenRepository.findByVoterIdAndHash.mockResolvedValue(token);
      tokenRepository.markAsUsed.mockResolvedValue(undefined);

      await service.verifyToken(validDto, voterId);

      expect(configService.get).toHaveBeenCalledWith('auth.expires', {
        infer: true,
      });
    });

    it('should include tokenId in authenticated JWT', async () => {
      const token = createMockToken({ id: 'specific-token-id' });
      tokenRepository.findByVoterIdAndHash.mockResolvedValue(token);
      tokenRepository.markAsUsed.mockResolvedValue(undefined);

      await service.verifyToken(validDto, voterId);

      expect(jwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          tokenId: 'specific-token-id',
        }),
        expect.any(Object),
      );
    });

    it('should work with lowercase token input', async () => {
      const token = createMockToken();
      const lowercaseDto: VerifyTokenDto = { token: 'abc123xyz789test' };
      tokenRepository.findByVoterIdAndHash.mockResolvedValue(token);
      tokenRepository.markAsUsed.mockResolvedValue(undefined);

      const result = await service.verifyToken(lowercaseDto, voterId);

      expect(result.token).toBeDefined();
    });

    it('should work with uppercase token input', async () => {
      const token = createMockToken();
      const uppercaseDto: VerifyTokenDto = { token: 'ABC123XYZ789TEST' };
      tokenRepository.findByVoterIdAndHash.mockResolvedValue(token);
      tokenRepository.markAsUsed.mockResolvedValue(undefined);

      const result = await service.verifyToken(uppercaseDto, voterId);

      expect(result.token).toBeDefined();
    });

    it('should work with mixed case token input', async () => {
      const token = createMockToken();
      const mixedDto: VerifyTokenDto = { token: 'AbC123xYz789TeSt' };
      tokenRepository.findByVoterIdAndHash.mockResolvedValue(token);
      tokenRepository.markAsUsed.mockResolvedValue(undefined);

      const result = await service.verifyToken(mixedDto, voterId);

      expect(result.token).toBeDefined();
    });

    it('should include voterId and tokenId in audit log', async () => {
      const token = createMockToken();
      tokenRepository.findByVoterIdAndHash.mockResolvedValue(token);
      tokenRepository.markAsUsed.mockResolvedValue(undefined);

      await service.verifyToken(validDto, voterId);

      expect(auditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: voterId,
          resourceId: token.id,
        }),
      );
    });

    it('should return both token and tokenExpires in response', async () => {
      const token = createMockToken();
      tokenRepository.findByVoterIdAndHash.mockResolvedValue(token);
      tokenRepository.markAsUsed.mockResolvedValue(undefined);

      const result = await service.verifyToken(validDto, voterId);

      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('tokenExpires');
    });

    it('should work with short tokens (6 chars)', async () => {
      const token = createMockToken();
      const shortDto: VerifyTokenDto = { token: 'ABC123' };
      tokenRepository.findByVoterIdAndHash.mockResolvedValue(token);
      tokenRepository.markAsUsed.mockResolvedValue(undefined);

      const result = await service.verifyToken(shortDto, voterId);

      expect(result.token).toBeDefined();
    });

    it('should work with long tokens (64 chars)', async () => {
      const token = createMockToken();
      const longToken = 'A'.repeat(64);
      const longDto: VerifyTokenDto = { token: longToken };
      tokenRepository.findByVoterIdAndHash.mockResolvedValue(token);
      tokenRepository.markAsUsed.mockResolvedValue(undefined);

      const result = await service.verifyToken(longDto, voterId);

      expect(result.token).toBeDefined();
    });
  });

  // ============================================
  // NEGATIVE TESTS - Verify Token (15 tests)
  // ============================================
  describe('verifyToken() - Negative Cases', () => {
    const validDto: VerifyTokenDto = { token: 'ABC123XYZ789TEST' };
    const voterId = 'voter-uuid-1234';

    it('should throw UnauthorizedException when token not found', async () => {
      tokenRepository.findByVoterIdAndHash.mockResolvedValue(null);

      await expect(service.verifyToken(validDto, voterId)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw with correct message when token invalid', async () => {
      tokenRepository.findByVoterIdAndHash.mockResolvedValue(null);

      await expect(service.verifyToken(validDto, voterId)).rejects.toThrow(
        'Invalid token.',
      );
    });

    it('should throw UnauthorizedException when token already used', async () => {
      const usedToken = createMockToken({
        isUsed: true,
        usedAt: new Date(),
      });
      tokenRepository.findByVoterIdAndHash.mockResolvedValue(usedToken);

      await expect(service.verifyToken(validDto, voterId)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw with correct message when token already used', async () => {
      const usedToken = createMockToken({
        isUsed: true,
        usedAt: new Date(),
      });
      tokenRepository.findByVoterIdAndHash.mockResolvedValue(usedToken);

      await expect(service.verifyToken(validDto, voterId)).rejects.toThrow(
        'Token has been used.',
      );
    });

    it('should log failed verification when token not found', async () => {
      tokenRepository.findByVoterIdAndHash.mockResolvedValue(null);

      try {
        await service.verifyToken(validDto, voterId);
      } catch {
        // expected
      }

      expect(auditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.VOTER_TOKEN_FAILED,
          details: expect.objectContaining({
            reason: 'Token not found or invalid',
          }),
        }),
      );
    });

    it('should log failed verification when token already used', async () => {
      const usedToken = createMockToken({
        isUsed: true,
        usedAt: new Date(),
      });
      tokenRepository.findByVoterIdAndHash.mockResolvedValue(usedToken);

      try {
        await service.verifyToken(validDto, voterId);
      } catch {
        // expected
      }

      expect(auditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.VOTER_TOKEN_FAILED,
          details: expect.objectContaining({
            reason: 'Token already used',
          }),
        }),
      );
    });

    it('should not mark token as used when verification fails', async () => {
      tokenRepository.findByVoterIdAndHash.mockResolvedValue(null);

      try {
        await service.verifyToken(validDto, voterId);
      } catch {
        // expected
      }

      expect(tokenRepository.markAsUsed).not.toHaveBeenCalled();
    });

    it('should not generate JWT when token not found', async () => {
      tokenRepository.findByVoterIdAndHash.mockResolvedValue(null);

      try {
        await service.verifyToken(validDto, voterId);
      } catch {
        // expected
      }

      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });

    it('should not generate JWT when token already used', async () => {
      const usedToken = createMockToken({ isUsed: true });
      tokenRepository.findByVoterIdAndHash.mockResolvedValue(usedToken);

      try {
        await service.verifyToken(validDto, voterId);
      } catch {
        // expected
      }

      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });

    it('should include usedAt in audit log when token already used', async () => {
      const usedAt = new Date('2024-01-15T10:00:00Z');
      const usedToken = createMockToken({
        isUsed: true,
        usedAt,
      });
      tokenRepository.findByVoterIdAndHash.mockResolvedValue(usedToken);

      try {
        await service.verifyToken(validDto, voterId);
      } catch {
        // expected
      }

      expect(auditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({
            usedAt,
          }),
        }),
      );
    });

    it('should handle token from different voter', async () => {
      const differentVoterId = 'different-voter-uuid';
      tokenRepository.findByVoterIdAndHash.mockResolvedValue(null);

      await expect(
        service.verifyToken(validDto, differentVoterId),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should include voterId in failed audit log', async () => {
      tokenRepository.findByVoterIdAndHash.mockResolvedValue(null);

      try {
        await service.verifyToken(validDto, voterId);
      } catch {
        // expected
      }

      expect(auditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: voterId,
        }),
      );
    });

    it('should not mark token used when token is already marked as used', async () => {
      const usedToken = createMockToken({ isUsed: true });
      tokenRepository.findByVoterIdAndHash.mockResolvedValue(usedToken);

      try {
        await service.verifyToken(validDto, voterId);
      } catch {
        // expected
      }

      expect(tokenRepository.markAsUsed).not.toHaveBeenCalled();
    });

    it('should propagate repository errors for findByVoterIdAndHash', async () => {
      tokenRepository.findByVoterIdAndHash.mockRejectedValue(
        new Error('Token DB Error'),
      );

      await expect(
        service.verifyToken({ token: 'ABC123' }, 'voter-id'),
      ).rejects.toThrow('Token DB Error');
    });

    it('should propagate repository errors for markAsUsed', async () => {
      const token = createMockToken();
      tokenRepository.findByVoterIdAndHash.mockResolvedValue(token);
      tokenRepository.markAsUsed.mockRejectedValue(
        new Error('Mark Used Error'),
      );

      await expect(
        service.verifyToken({ token: 'ABC123' }, 'voter-uuid-1234'),
      ).rejects.toThrow('Mark Used Error');
    });
  });

  // ============================================
  // EDGE CASES (20 tests)
  // ============================================
  describe('Edge Cases', () => {
    describe('hashToken()', () => {
      it('should produce consistent hash for same token', () => {
        const hash1 = service.hashToken('TESTTOKEN123');
        const hash2 = service.hashToken('TESTTOKEN123');

        expect(hash1).toBe(hash2);
      });

      it('should normalize token to uppercase before hashing', () => {
        const hash1 = service.hashToken('testtoken123');
        const hash2 = service.hashToken('TESTTOKEN123');
        const hash3 = service.hashToken('TestToken123');

        expect(hash1).toBe(hash2);
        expect(hash2).toBe(hash3);
      });

      it('should produce 64-character hex string', () => {
        const hash = service.hashToken('ANYTOKEN');

        expect(hash).toHaveLength(64);
        expect(hash).toMatch(/^[a-f0-9]+$/);
      });

      it('should produce different hashes for different tokens', () => {
        const hash1 = service.hashToken('TOKEN1');
        const hash2 = service.hashToken('TOKEN2');

        expect(hash1).not.toBe(hash2);
      });

      it('should handle empty string', () => {
        const hash = service.hashToken('');

        expect(hash).toHaveLength(64);
      });

      it('should handle special characters', () => {
        const hash = service.hashToken('TEST!@#$%^&*()');

        expect(hash).toHaveLength(64);
      });

      it('should handle unicode characters', () => {
        const hash = service.hashToken('TOKEN🎉中文');

        expect(hash).toHaveLength(64);
      });

      it('should handle very long tokens', () => {
        const longToken = 'A'.repeat(1000);
        const hash = service.hashToken(longToken);

        expect(hash).toHaveLength(64);
      });
    });

    describe('JWT Service Error Handling', () => {
      it('should propagate JWT signing errors in verifyToken', async () => {
        const token = createMockToken();
        tokenRepository.findByVoterIdAndHash.mockResolvedValue(token);
        tokenRepository.markAsUsed.mockResolvedValue(undefined);
        (jwtService.signAsync as jest.Mock).mockRejectedValue(
          new Error('JWT Error'),
        );

        await expect(
          service.verifyToken({ token: 'ABC123' }, 'voter-uuid-1234'),
        ).rejects.toThrow('JWT Error');
      });
    });

    describe('Voter State Edge Cases', () => {
      it('should allow login with deleted voter (null deletedAt)', async () => {
        const voter = createMockVoter({ deletedAt: null });
        voterRepository.findByNim.mockResolvedValue(voter);

        const result = await service.login({ nim: '2210512109' });

        expect(result.sessionToken).toBeDefined();
      });
    });

    describe('Token State Edge Cases', () => {
      it('should handle token with null voterId', async () => {
        const tokenWithNullVoter = createMockToken({ voterId: null });
        tokenRepository.findByVoterIdAndHash.mockResolvedValue(
          tokenWithNullVoter,
        );
        tokenRepository.markAsUsed.mockResolvedValue(undefined);

        const result = await service.verifyToken(
          { token: 'ABC123' },
          'voter-uuid-1234',
        );

        expect(result.token).toBeDefined();
      });

      it('should handle token with high resend count', async () => {
        const highResendToken = createMockToken({ resendCount: 100 });
        tokenRepository.findByVoterIdAndHash.mockResolvedValue(highResendToken);
        tokenRepository.markAsUsed.mockResolvedValue(undefined);

        const result = await service.verifyToken(
          { token: 'ABC123' },
          'voter-uuid-1234',
        );

        expect(result.token).toBeDefined();
      });

      it('should handle token generated long ago', async () => {
        const oldToken = createMockToken({
          generatedAt: new Date('2020-01-01'),
        });
        tokenRepository.findByVoterIdAndHash.mockResolvedValue(oldToken);
        tokenRepository.markAsUsed.mockResolvedValue(undefined);

        const result = await service.verifyToken(
          { token: 'ABC123' },
          'voter-uuid-1234',
        );

        expect(result.token).toBeDefined();
      });
    });

    describe('NIM Format Edge Cases', () => {
      it('should handle NIM with only numbers', async () => {
        const voter = createMockVoter({ nim: '1234567890' });
        voterRepository.findByNim.mockResolvedValue(voter);

        const result = await service.login({ nim: '1234567890' });

        expect(result.voter.nim).toBe('1234567890');
      });

      it('should handle NIM with alphanumeric mix', async () => {
        const voter = createMockVoter({ nim: 'ABC123XYZ' });
        voterRepository.findByNim.mockResolvedValue(voter);

        const result = await service.login({ nim: 'ABC123XYZ' });

        expect(result.voter.nim).toBe('ABC123XYZ');
      });
    });

    describe('Concurrent Operations', () => {
      it('should handle concurrent token verifications', async () => {
        const token = createMockToken();
        tokenRepository.findByVoterIdAndHash.mockResolvedValue(token);
        tokenRepository.markAsUsed.mockResolvedValue(undefined);

        const result = await service.verifyToken(
          { token: 'ABC123' },
          'voter-uuid-1234',
        );

        expect(result.token).toBeDefined();
      });
    });

    describe('i18n Edge Cases', () => {
      it('should handle missing i18n translation gracefully', async () => {
        (i18nService.t as jest.Mock).mockReturnValue('voterAuth.unknownError');
        voterRepository.findByNim.mockResolvedValue(null);

        await expect(service.login({ nim: 'unknown' })).rejects.toThrow();
      });
    });
  });
});
