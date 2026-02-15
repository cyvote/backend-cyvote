import { Test, TestingModule } from '@nestjs/testing';
import { AdminResendTokenService } from './admin-resend-token.service';
import { TokenEmailDistributionService } from './token-email-distribution.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { I18nService } from 'nestjs-i18n';
import { DataSource, QueryRunner } from 'typeorm';
import { ElectionStatus } from '../election-schedule/domain/election-config.model';
import { Token } from '../auth-voter/domain/token.model';

describe('AdminResendTokenService', () => {
  let service: AdminResendTokenService;
  let tokenRepository: any;
  let electionConfigRepository: any;
  let tokenEmailDistributionService: any;
  let auditLogService: any;
  let dataSource: any;
  let queryRunner: any;

  const mockVoter = {
    id: 'voter-uuid',
    email: 'voter@example.com',
    namaLengkap: 'John Doe',
    nim: '123456',
  };

  const mockToken = new Token({
    id: 'token-uuid',
    voterId: 'voter-uuid',
    tokenHash: 'old-hash',
    generatedAt: new Date(),
    isUsed: false,
    resendCount: 0,
    emailSentAt: new Date(),
  });

  beforeEach(async () => {
    queryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {},
    };

    dataSource = {
      createQueryRunner: jest.fn().mockReturnValue(queryRunner),
    };

    tokenRepository = {
      findVoterById: jest.fn().mockResolvedValue(mockVoter),
      findActiveTokenByVoterId: jest.fn().mockResolvedValue(mockToken),
      replaceToken: jest.fn().mockImplementation((id, hash, count) => {
        return Promise.resolve(
          new Token({
            ...mockToken,
            tokenHash: hash,
            resendCount: count + 1,
          }),
        );
      }),
      incrementResendCount: jest.fn(), // Should NOT be called
      markEmailSent: jest.fn(),
    };

    electionConfigRepository = {
      findCurrentConfig: jest.fn().mockResolvedValue({
        status: ElectionStatus.ACTIVE,
      }),
    };

    tokenEmailDistributionService = {
      sendSingleTokenEmail: jest.fn().mockResolvedValue(true),
    };

    auditLogService = {
      log: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminResendTokenService,
        {
          provide: 'TokenGenerationRepositoryInterface',
          useValue: tokenRepository,
        },
        {
          provide: 'ElectionConfigRepositoryInterface',
          useValue: electionConfigRepository,
        },
        {
          provide: TokenEmailDistributionService,
          useValue: tokenEmailDistributionService,
        },
        {
          provide: AuditLogService,
          useValue: auditLogService,
        },
        {
          provide: I18nService,
          useValue: {
            t: jest.fn().mockReturnValue('Translated message'),
          },
        },
        {
          provide: DataSource,
          useValue: dataSource,
        },
      ],
    }).compile();

    service = module.get<AdminResendTokenService>(AdminResendTokenService);
  });

  describe('resendToken', () => {
    it('should increment resendCount by exactly 1 and use transaction', async () => {
      // Act
      const result = await service.resendToken('voter-uuid', 'admin-uuid');

      // Assert
      // 1. Transaction flow
      expect(dataSource.createQueryRunner).toHaveBeenCalled();
      expect(queryRunner.connect).toHaveBeenCalled();
      expect(queryRunner.startTransaction).toHaveBeenCalled();
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();

      // 2. Repository calls
      expect(tokenRepository.replaceToken).toHaveBeenCalledWith(
        'voter-uuid',
        expect.any(String),
        0, // Passed previous count
        queryRunner, // Passed QueryRunner
      );

      expect(tokenRepository.findActiveTokenByVoterId).toHaveBeenCalledWith(
        'voter-uuid',
        queryRunner,
        true, // Expect lock to be true
      );

      // 3. IMPORTANT: Ensure incrementResendCount is NOT called
      expect(tokenRepository.incrementResendCount).not.toHaveBeenCalled();

      // 4. Result check
      expect(result.resendCount).toBe(1);
    });

    it('should rollback transaction on error', async () => {
      // Arrange
      tokenRepository.findVoterById.mockRejectedValue(new Error('DB Error'));

      // Act & Assert
      await expect(
        service.resendToken('voter-uuid', 'admin-uuid'),
      ).rejects.toThrow('DB Error');

      expect(queryRunner.startTransaction).toHaveBeenCalled();
      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
    });
  });
});
