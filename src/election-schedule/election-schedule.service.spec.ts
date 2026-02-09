import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { I18nService, I18nContext } from 'nestjs-i18n';
import { ElectionScheduleService } from './election-schedule.service';
import { ElectionExtensionEmailService } from './election-extension-email.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { ElectionConfigRepositoryInterface } from './interfaces/election-config.repository.interface';
import { ElectionConfig, ElectionStatus } from './domain/election-config.model';
import {
  ElectionConfigAlreadyExistsException,
  ElectionConfigNotFoundException,
  InvalidElectionDurationException,
  StartDateMustBeFutureException,
  EndDateMustBeAfterStartException,
  ElectionNotActiveException,
  InvalidExtensionDateException,
  ExtensionExceedsMaximumException,
} from './errors';

describe('ElectionScheduleService', () => {
  let service: ElectionScheduleService;
  let electionConfigRepository: jest.Mocked<ElectionConfigRepositoryInterface>;
  let auditLogService: jest.Mocked<AuditLogService>;
  let electionExtensionEmailService: jest.Mocked<ElectionExtensionEmailService>;
  let i18nService: jest.Mocked<I18nService>;
  let configService: { get: jest.Mock };

  const mockAdminId = '123e4567-e89b-12d3-a456-426614174000';

  const createMockElectionConfig = (
    overrides: Partial<ElectionConfig> = {},
  ): ElectionConfig => {
    return new ElectionConfig({
      id: '123e4567-e89b-12d3-a456-426614174001',
      startDate: new Date('2026-02-10T08:00:00+07:00'),
      endDate: new Date('2026-02-10T17:00:00+07:00'),
      status: ElectionStatus.SCHEDULED,
      resultsPublishedAt: null,
      createdBy: mockAdminId,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    });
  };

  beforeEach(async () => {
    const mockElectionConfigRepository: jest.Mocked<ElectionConfigRepositoryInterface> =
      {
        create: jest.fn(),
        findCurrentConfig: jest.fn(),
        updateStatus: jest.fn(),
        updateEndDate: jest.fn(),
      };

    const mockAuditLogService = {
      log: jest.fn(),
    };

    const mockElectionExtensionEmailService = {
      sendExtensionNotifications: jest.fn(),
    };

    const mockI18nService = {
      t: jest.fn().mockImplementation((key: string) => key),
    };

    const mockConfigService = {
      get: jest.fn().mockReturnValue('development'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ElectionScheduleService,
        {
          provide: 'ElectionConfigRepositoryInterface',
          useValue: mockElectionConfigRepository,
        },
        { provide: AuditLogService, useValue: mockAuditLogService },
        {
          provide: ElectionExtensionEmailService,
          useValue: mockElectionExtensionEmailService,
        },
        { provide: I18nService, useValue: mockI18nService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<ElectionScheduleService>(ElectionScheduleService);
    electionConfigRepository = module.get('ElectionConfigRepositoryInterface');
    auditLogService = module.get(AuditLogService);
    electionExtensionEmailService = module.get(ElectionExtensionEmailService);
    i18nService = module.get(I18nService);
    configService = module.get(ConfigService);

    // Mock I18nContext
    jest.spyOn(I18nContext, 'current').mockReturnValue({
      lang: 'en',
    } as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Positive Tests', () => {
    // Test 1
    it('should create election schedule successfully', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const endDate = new Date(futureDate.getTime() + 9 * 60 * 60 * 1000);

      const dto = {
        startDate: futureDate.toISOString(),
        endDate: endDate.toISOString(),
      };

      electionConfigRepository.findCurrentConfig.mockResolvedValue(null);
      electionConfigRepository.create.mockResolvedValue(
        createMockElectionConfig({
          startDate: futureDate,
          endDate: endDate,
        }),
      );

      const result = await service.setSchedule(dto, mockAdminId);

      expect(result.data).toBeDefined();
      expect(result.message).toBe('electionSchedule.scheduleCreated');
      expect(auditLogService.log).toHaveBeenCalled();
    });

    // Test 2
    it('should get current config successfully', async () => {
      const mockConfig = createMockElectionConfig();
      electionConfigRepository.findCurrentConfig.mockResolvedValue(mockConfig);

      const result = await service.getCurrentConfig();

      expect(result.data.id).toBe(mockConfig.id);
      expect(result.message).toBe('electionSchedule.configRetrieved');
    });

    // Test 3
    it('should get public status when config exists', async () => {
      const mockConfig = createMockElectionConfig({
        status: ElectionStatus.ACTIVE,
      });
      electionConfigRepository.findCurrentConfig.mockResolvedValue(mockConfig);

      const result = await service.getPublicStatus();

      expect(result.data.isVotingOpen).toBe(true);
      expect(result.data.status).toBe(ElectionStatus.ACTIVE);
    });

    // Test 4
    it('should return default status when no config exists', async () => {
      electionConfigRepository.findCurrentConfig.mockResolvedValue(null);

      const result = await service.getPublicStatus();

      expect(result.data.isVotingOpen).toBe(false);
      expect(result.data.status).toBe(ElectionStatus.SCHEDULED);
    });

    // Test 5
    it('should extend election successfully', async () => {
      const mockConfig = createMockElectionConfig({
        status: ElectionStatus.ACTIVE,
        endDate: new Date('2026-02-10T17:00:00+07:00'),
      });
      const newEndDate = new Date('2026-02-10T20:00:00+07:00');

      electionConfigRepository.findCurrentConfig.mockResolvedValue(mockConfig);
      electionConfigRepository.updateEndDate.mockResolvedValue(
        createMockElectionConfig({
          ...mockConfig,
          endDate: newEndDate,
        }),
      );

      const result = await service.extendElection(
        {
          newEndDate: newEndDate.toISOString(),
          reason: 'Technical issues affecting voters',
        },
        mockAdminId,
      );

      expect(result.data).toBeDefined();
      expect(auditLogService.log).toHaveBeenCalled();
      expect(
        electionExtensionEmailService.sendExtensionNotifications,
      ).toHaveBeenCalled();
    });

    // Test 6
    it('should create schedule with minimum duration (6 hours) in production', async () => {
      configService.get.mockReturnValue('production');
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const endDate = new Date(futureDate.getTime() + 6 * 60 * 60 * 1000);

      electionConfigRepository.findCurrentConfig.mockResolvedValue(null);
      electionConfigRepository.create.mockResolvedValue(
        createMockElectionConfig({
          startDate: futureDate,
          endDate: endDate,
        }),
      );

      const result = await service.setSchedule(
        {
          startDate: futureDate.toISOString(),
          endDate: endDate.toISOString(),
        },
        mockAdminId,
      );

      expect(result.data).toBeDefined();
    });

    // Test 7
    it('should create schedule with maximum duration (7 days)', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const endDate = new Date(futureDate.getTime() + 7 * 24 * 60 * 60 * 1000);

      electionConfigRepository.findCurrentConfig.mockResolvedValue(null);
      electionConfigRepository.create.mockResolvedValue(
        createMockElectionConfig({
          startDate: futureDate,
          endDate: endDate,
        }),
      );

      const result = await service.setSchedule(
        {
          startDate: futureDate.toISOString(),
          endDate: endDate.toISOString(),
        },
        mockAdminId,
      );

      expect(result.data).toBeDefined();
    });

    // Test 8
    it('should extend election by exactly 24 hours', async () => {
      const mockConfig = createMockElectionConfig({
        status: ElectionStatus.ACTIVE,
        endDate: new Date('2026-02-10T17:00:00Z'),
      });
      const newEndDate = new Date('2026-02-11T17:00:00Z');

      electionConfigRepository.findCurrentConfig.mockResolvedValue(mockConfig);
      electionConfigRepository.updateEndDate.mockResolvedValue(
        createMockElectionConfig({ endDate: newEndDate }),
      );

      const result = await service.extendElection(
        {
          newEndDate: newEndDate.toISOString(),
          reason: 'Maximum extension for voters',
        },
        mockAdminId,
      );

      expect(result.data).toBeDefined();
    });

    // Test 9
    it('should extend election by 1 hour', async () => {
      const mockConfig = createMockElectionConfig({
        status: ElectionStatus.ACTIVE,
        endDate: new Date('2026-02-10T17:00:00Z'),
      });
      const newEndDate = new Date('2026-02-10T18:00:00Z');

      electionConfigRepository.findCurrentConfig.mockResolvedValue(mockConfig);
      electionConfigRepository.updateEndDate.mockResolvedValue(
        createMockElectionConfig({ endDate: newEndDate }),
      );

      const result = await service.extendElection(
        {
          newEndDate: newEndDate.toISOString(),
          reason: 'Small extension for final voters',
        },
        mockAdminId,
      );

      expect(result.data).toBeDefined();
    });

    // Test 10
    it('should return isVotingOpen false when status is SCHEDULED', async () => {
      const mockConfig = createMockElectionConfig({
        status: ElectionStatus.SCHEDULED,
      });
      electionConfigRepository.findCurrentConfig.mockResolvedValue(mockConfig);

      const result = await service.getPublicStatus();

      expect(result.data.isVotingOpen).toBe(false);
    });

    // Test 11
    it('should return isVotingOpen false when status is CLOSED', async () => {
      const mockConfig = createMockElectionConfig({
        status: ElectionStatus.CLOSED,
      });
      electionConfigRepository.findCurrentConfig.mockResolvedValue(mockConfig);

      const result = await service.getPublicStatus();

      expect(result.data.isVotingOpen).toBe(false);
    });

    // Test 12
    it('should return isVotingOpen false when status is PUBLISHED', async () => {
      const mockConfig = createMockElectionConfig({
        status: ElectionStatus.PUBLISHED,
      });
      electionConfigRepository.findCurrentConfig.mockResolvedValue(mockConfig);

      const result = await service.getPublicStatus();

      expect(result.data.isVotingOpen).toBe(false);
    });

    // Test 13
    it('should log audit with correct details on schedule creation', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const endDate = new Date(futureDate.getTime() + 9 * 60 * 60 * 1000);

      electionConfigRepository.findCurrentConfig.mockResolvedValue(null);
      electionConfigRepository.create.mockResolvedValue(
        createMockElectionConfig({
          startDate: futureDate,
          endDate: endDate,
        }),
      );

      await service.setSchedule(
        {
          startDate: futureDate.toISOString(),
          endDate: endDate.toISOString(),
        },
        mockAdminId,
      );

      expect(auditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: mockAdminId,
          action: 'ELECTION_SCHEDULED',
        }),
      );
    });

    // Test 14
    it('should log audit with correct details on extension', async () => {
      const mockConfig = createMockElectionConfig({
        status: ElectionStatus.ACTIVE,
      });
      const newEndDate = new Date(
        mockConfig.endDate.getTime() + 3 * 60 * 60 * 1000,
      );

      electionConfigRepository.findCurrentConfig.mockResolvedValue(mockConfig);
      electionConfigRepository.updateEndDate.mockResolvedValue(
        createMockElectionConfig({ endDate: newEndDate }),
      );

      await service.extendElection(
        {
          newEndDate: newEndDate.toISOString(),
          reason: 'Test extension reason',
        },
        mockAdminId,
      );

      expect(auditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: mockAdminId,
          action: 'ELECTION_EXTENDED',
          details: expect.objectContaining({
            reason: 'Test extension reason',
          }),
        }),
      );
    });

    // Test 15
    it('should call email service on extension', async () => {
      const mockConfig = createMockElectionConfig({
        status: ElectionStatus.ACTIVE,
      });
      const newEndDate = new Date(
        mockConfig.endDate.getTime() + 3 * 60 * 60 * 1000,
      );

      electionConfigRepository.findCurrentConfig.mockResolvedValue(mockConfig);
      electionConfigRepository.updateEndDate.mockResolvedValue(
        createMockElectionConfig({ endDate: newEndDate }),
      );

      await service.extendElection(
        {
          newEndDate: newEndDate.toISOString(),
          reason: 'Sending email test',
        },
        mockAdminId,
      );

      expect(
        electionExtensionEmailService.sendExtensionNotifications,
      ).toHaveBeenCalledWith(expect.any(Date), 'Sending email test');
    });
  });

  describe('Negative Tests', () => {
    // Test 16
    it('should throw ElectionConfigAlreadyExistsException when config exists', async () => {
      const mockConfig = createMockElectionConfig();
      electionConfigRepository.findCurrentConfig.mockResolvedValue(mockConfig);

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      await expect(
        service.setSchedule(
          {
            startDate: futureDate.toISOString(),
            endDate: new Date(
              futureDate.getTime() + 9 * 60 * 60 * 1000,
            ).toISOString(),
          },
          mockAdminId,
        ),
      ).rejects.toThrow(ElectionConfigAlreadyExistsException);
    });

    // Test 17
    it('should throw ElectionConfigNotFoundException when no config exists for getCurrentConfig', async () => {
      electionConfigRepository.findCurrentConfig.mockResolvedValue(null);

      await expect(service.getCurrentConfig()).rejects.toThrow(
        ElectionConfigNotFoundException,
      );
    });

    // Test 18
    it('should throw StartDateMustBeFutureException when start date is in past', async () => {
      electionConfigRepository.findCurrentConfig.mockResolvedValue(null);
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      await expect(
        service.setSchedule(
          {
            startDate: pastDate.toISOString(),
            endDate: new Date(
              pastDate.getTime() + 9 * 60 * 60 * 1000,
            ).toISOString(),
          },
          mockAdminId,
        ),
      ).rejects.toThrow(StartDateMustBeFutureException);
    });

    // Test 19
    it('should throw EndDateMustBeAfterStartException when end date is before start', async () => {
      electionConfigRepository.findCurrentConfig.mockResolvedValue(null);
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const earlierDate = new Date(futureDate.getTime() - 1 * 60 * 60 * 1000);

      await expect(
        service.setSchedule(
          {
            startDate: futureDate.toISOString(),
            endDate: earlierDate.toISOString(),
          },
          mockAdminId,
        ),
      ).rejects.toThrow(EndDateMustBeAfterStartException);
    });

    // Test 20
    it('should throw InvalidElectionDurationException when duration is less than 6 hours in production', async () => {
      configService.get.mockReturnValue('production');
      electionConfigRepository.findCurrentConfig.mockResolvedValue(null);
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const endDate = new Date(futureDate.getTime() + 5 * 60 * 60 * 1000);

      await expect(
        service.setSchedule(
          {
            startDate: futureDate.toISOString(),
            endDate: endDate.toISOString(),
          },
          mockAdminId,
        ),
      ).rejects.toThrow(InvalidElectionDurationException);
    });

    // Test 21
    it('should throw InvalidElectionDurationException when duration exceeds 7 days', async () => {
      electionConfigRepository.findCurrentConfig.mockResolvedValue(null);
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const endDate = new Date(futureDate.getTime() + 8 * 24 * 60 * 60 * 1000);

      await expect(
        service.setSchedule(
          {
            startDate: futureDate.toISOString(),
            endDate: endDate.toISOString(),
          },
          mockAdminId,
        ),
      ).rejects.toThrow(InvalidElectionDurationException);
    });

    // Test 22
    it('should throw ElectionConfigNotFoundException when no config for extend', async () => {
      electionConfigRepository.findCurrentConfig.mockResolvedValue(null);

      await expect(
        service.extendElection(
          {
            newEndDate: new Date().toISOString(),
            reason: 'Test extension',
          },
          mockAdminId,
        ),
      ).rejects.toThrow(ElectionConfigNotFoundException);
    });

    // Test 23
    it('should throw ElectionNotActiveException when status is SCHEDULED', async () => {
      const mockConfig = createMockElectionConfig({
        status: ElectionStatus.SCHEDULED,
      });
      electionConfigRepository.findCurrentConfig.mockResolvedValue(mockConfig);

      await expect(
        service.extendElection(
          {
            newEndDate: new Date().toISOString(),
            reason: 'Test extension',
          },
          mockAdminId,
        ),
      ).rejects.toThrow(ElectionNotActiveException);
    });

    // Test 24
    it('should throw ElectionNotActiveException when status is CLOSED', async () => {
      const mockConfig = createMockElectionConfig({
        status: ElectionStatus.CLOSED,
      });
      electionConfigRepository.findCurrentConfig.mockResolvedValue(mockConfig);

      await expect(
        service.extendElection(
          {
            newEndDate: new Date().toISOString(),
            reason: 'Test extension',
          },
          mockAdminId,
        ),
      ).rejects.toThrow(ElectionNotActiveException);
    });

    // Test 25
    it('should throw ElectionNotActiveException when status is PUBLISHED', async () => {
      const mockConfig = createMockElectionConfig({
        status: ElectionStatus.PUBLISHED,
      });
      electionConfigRepository.findCurrentConfig.mockResolvedValue(mockConfig);

      await expect(
        service.extendElection(
          {
            newEndDate: new Date().toISOString(),
            reason: 'Test extension',
          },
          mockAdminId,
        ),
      ).rejects.toThrow(ElectionNotActiveException);
    });

    // Test 26
    it('should throw InvalidExtensionDateException when new end is before current end', async () => {
      const mockConfig = createMockElectionConfig({
        status: ElectionStatus.ACTIVE,
        endDate: new Date('2026-02-10T17:00:00Z'),
      });
      electionConfigRepository.findCurrentConfig.mockResolvedValue(mockConfig);

      await expect(
        service.extendElection(
          {
            newEndDate: new Date('2026-02-10T16:00:00Z').toISOString(),
            reason: 'Test extension',
          },
          mockAdminId,
        ),
      ).rejects.toThrow(InvalidExtensionDateException);
    });

    // Test 27
    it('should throw InvalidExtensionDateException when new end equals current end', async () => {
      const mockConfig = createMockElectionConfig({
        status: ElectionStatus.ACTIVE,
        endDate: new Date('2026-02-10T17:00:00Z'),
      });
      electionConfigRepository.findCurrentConfig.mockResolvedValue(mockConfig);

      await expect(
        service.extendElection(
          {
            newEndDate: new Date('2026-02-10T17:00:00Z').toISOString(),
            reason: 'Test extension',
          },
          mockAdminId,
        ),
      ).rejects.toThrow(InvalidExtensionDateException);
    });

    // Test 28
    it('should throw ExtensionExceedsMaximumException when extension exceeds 24 hours', async () => {
      const mockConfig = createMockElectionConfig({
        status: ElectionStatus.ACTIVE,
        endDate: new Date('2026-02-10T17:00:00Z'),
      });
      electionConfigRepository.findCurrentConfig.mockResolvedValue(mockConfig);

      await expect(
        service.extendElection(
          {
            newEndDate: new Date('2026-02-11T18:00:00Z').toISOString(),
            reason: 'Test extension',
          },
          mockAdminId,
        ),
      ).rejects.toThrow(ExtensionExceedsMaximumException);
    });

    // Test 29
    it('should throw when duration is exactly at lower boundary minus 1 minute in production', async () => {
      configService.get.mockReturnValue('production');
      electionConfigRepository.findCurrentConfig.mockResolvedValue(null);
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const endDate = new Date(
        futureDate.getTime() + 6 * 60 * 60 * 1000 - 60 * 1000,
      );

      await expect(
        service.setSchedule(
          {
            startDate: futureDate.toISOString(),
            endDate: endDate.toISOString(),
          },
          mockAdminId,
        ),
      ).rejects.toThrow(InvalidElectionDurationException);
    });

    // Test 30
    it('should throw when duration exceeds upper boundary by 1 minute', async () => {
      electionConfigRepository.findCurrentConfig.mockResolvedValue(null);
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const endDate = new Date(
        futureDate.getTime() + 7 * 24 * 60 * 60 * 1000 + 60 * 1000,
      );

      await expect(
        service.setSchedule(
          {
            startDate: futureDate.toISOString(),
            endDate: endDate.toISOString(),
          },
          mockAdminId,
        ),
      ).rejects.toThrow(InvalidElectionDurationException);
    });
  });

  describe('Edge Cases', () => {
    // Test 31
    it('should handle start date exactly at current time (boundary)', async () => {
      electionConfigRepository.findCurrentConfig.mockResolvedValue(null);
      const now = new Date();

      await expect(
        service.setSchedule(
          {
            startDate: now.toISOString(),
            endDate: new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString(),
          },
          mockAdminId,
        ),
      ).rejects.toThrow(StartDateMustBeFutureException);
    });

    // Test 32
    it('should handle null createdBy in config', async () => {
      const mockConfig = createMockElectionConfig({
        createdBy: null,
      });
      electionConfigRepository.findCurrentConfig.mockResolvedValue(mockConfig);

      const result = await service.getCurrentConfig();

      expect(result.data.createdBy).toBeNull();
    });

    // Test 33
    it('should handle ISO date strings with timezone offset', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const endDate = new Date(futureDate.getTime() + 9 * 60 * 60 * 1000);

      electionConfigRepository.findCurrentConfig.mockResolvedValue(null);
      electionConfigRepository.create.mockResolvedValue(
        createMockElectionConfig(),
      );

      const result = await service.setSchedule(
        {
          startDate: futureDate.toISOString().replace('Z', '+07:00'),
          endDate: endDate.toISOString().replace('Z', '+07:00'),
        },
        mockAdminId,
      );

      expect(result.data).toBeDefined();
    });

    // Test 34
    it('should format dates to WIB in response', async () => {
      const mockConfig = createMockElectionConfig();
      electionConfigRepository.findCurrentConfig.mockResolvedValue(mockConfig);

      const result = await service.getCurrentConfig();

      expect(result.data.startDate).toContain('+07:00');
      expect(result.data.endDate).toContain('+07:00');
    });

    // Test 35
    it('should handle extension at the exact 24 hour limit', async () => {
      const mockConfig = createMockElectionConfig({
        status: ElectionStatus.ACTIVE,
        endDate: new Date('2026-02-10T17:00:00.000Z'),
      });
      const newEndDate = new Date('2026-02-11T17:00:00.000Z');

      electionConfigRepository.findCurrentConfig.mockResolvedValue(mockConfig);
      electionConfigRepository.updateEndDate.mockResolvedValue(
        createMockElectionConfig({ endDate: newEndDate }),
      );

      const result = await service.extendElection(
        {
          newEndDate: newEndDate.toISOString(),
          reason: 'Exact 24 hour extension',
        },
        mockAdminId,
      );

      expect(result.data).toBeDefined();
    });

    // Test 36
    it('should handle extension 1ms over 24 hour limit', async () => {
      const mockConfig = createMockElectionConfig({
        status: ElectionStatus.ACTIVE,
        endDate: new Date('2026-02-10T17:00:00.000Z'),
      });
      const newEndDate = new Date('2026-02-11T17:00:00.001Z');

      electionConfigRepository.findCurrentConfig.mockResolvedValue(mockConfig);

      await expect(
        service.extendElection(
          {
            newEndDate: newEndDate.toISOString(),
            reason: 'Just over 24 hour extension',
          },
          mockAdminId,
        ),
      ).rejects.toThrow(ExtensionExceedsMaximumException);
    });

    // Test 37
    it('should handle very long reason string in extension', async () => {
      const mockConfig = createMockElectionConfig({
        status: ElectionStatus.ACTIVE,
      });
      const newEndDate = new Date(
        mockConfig.endDate.getTime() + 3 * 60 * 60 * 1000,
      );
      const longReason = 'A'.repeat(1000);

      electionConfigRepository.findCurrentConfig.mockResolvedValue(mockConfig);
      electionConfigRepository.updateEndDate.mockResolvedValue(
        createMockElectionConfig({ endDate: newEndDate }),
      );

      const result = await service.extendElection(
        {
          newEndDate: newEndDate.toISOString(),
          reason: longReason,
        },
        mockAdminId,
      );

      expect(result.data).toBeDefined();
    });

    // Test 38
    it('should return empty dates when no config for public status', async () => {
      electionConfigRepository.findCurrentConfig.mockResolvedValue(null);

      const result = await service.getPublicStatus();

      expect(result.data.startDate).toBe('');
      expect(result.data.endDate).toBe('');
    });

    // Test 39
    it('should handle multiple calls to getCurrentConfig', async () => {
      const mockConfig = createMockElectionConfig();
      electionConfigRepository.findCurrentConfig.mockResolvedValue(mockConfig);

      await service.getCurrentConfig();
      await service.getCurrentConfig();
      await service.getCurrentConfig();

      expect(electionConfigRepository.findCurrentConfig).toHaveBeenCalledTimes(
        3,
      );
    });

    // Test 40
    it('should preserve original config ID after extension', async () => {
      const originalId = 'original-config-id';
      const mockConfig = createMockElectionConfig({
        id: originalId,
        status: ElectionStatus.ACTIVE,
      });
      const newEndDate = new Date(
        mockConfig.endDate.getTime() + 3 * 60 * 60 * 1000,
      );

      electionConfigRepository.findCurrentConfig.mockResolvedValue(mockConfig);
      electionConfigRepository.updateEndDate.mockResolvedValue(
        createMockElectionConfig({
          id: originalId,
          endDate: newEndDate,
        }),
      );

      const result = await service.extendElection(
        {
          newEndDate: newEndDate.toISOString(),
          reason: 'Test preserving ID',
        },
        mockAdminId,
      );

      expect(result.data.id).toBe(originalId);
    });
  });

  describe('Non-Production Duration Rules', () => {
    // Test 41
    it('should allow duration less than 6 hours in non-production environment', async () => {
      configService.get.mockReturnValue('development');
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const endDate = new Date(futureDate.getTime() + 2 * 60 * 1000); // 2 minutes

      electionConfigRepository.findCurrentConfig.mockResolvedValue(null);
      electionConfigRepository.create.mockResolvedValue(
        createMockElectionConfig({
          startDate: futureDate,
          endDate: endDate,
        }),
      );

      const result = await service.setSchedule(
        {
          startDate: futureDate.toISOString(),
          endDate: endDate.toISOString(),
        },
        mockAdminId,
      );

      expect(result.data).toBeDefined();
    });

    // Test 42
    it('should enforce minimum 1 minute duration in non-production environment', async () => {
      configService.get.mockReturnValue('development');
      electionConfigRepository.findCurrentConfig.mockResolvedValue(null);
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const endDate = new Date(futureDate.getTime() + 30 * 1000); // 30 seconds

      await expect(
        service.setSchedule(
          {
            startDate: futureDate.toISOString(),
            endDate: endDate.toISOString(),
          },
          mockAdminId,
        ),
      ).rejects.toThrow(InvalidElectionDurationException);
    });

    // Test 43
    it('should still enforce 6-hour minimum in production environment', async () => {
      configService.get.mockReturnValue('production');
      electionConfigRepository.findCurrentConfig.mockResolvedValue(null);
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const endDate = new Date(futureDate.getTime() + 2 * 60 * 1000); // 2 minutes

      await expect(
        service.setSchedule(
          {
            startDate: futureDate.toISOString(),
            endDate: endDate.toISOString(),
          },
          mockAdminId,
        ),
      ).rejects.toThrow(InvalidElectionDurationException);
    });

    // Test 44
    it('should still enforce 7-day maximum in non-production environment', async () => {
      configService.get.mockReturnValue('development');
      electionConfigRepository.findCurrentConfig.mockResolvedValue(null);
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const endDate = new Date(
        futureDate.getTime() + 8 * 24 * 60 * 60 * 1000,
      ); // 8 days

      await expect(
        service.setSchedule(
          {
            startDate: futureDate.toISOString(),
            endDate: endDate.toISOString(),
          },
          mockAdminId,
        ),
      ).rejects.toThrow(InvalidElectionDurationException);
    });

    // Test 45
    it('should allow exactly 1 minute duration in non-production environment', async () => {
      configService.get.mockReturnValue('development');
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const endDate = new Date(futureDate.getTime() + 1 * 60 * 1000); // exactly 1 minute

      electionConfigRepository.findCurrentConfig.mockResolvedValue(null);
      electionConfigRepository.create.mockResolvedValue(
        createMockElectionConfig({
          startDate: futureDate,
          endDate: endDate,
        }),
      );

      const result = await service.setSchedule(
        {
          startDate: futureDate.toISOString(),
          endDate: endDate.toISOString(),
        },
        mockAdminId,
      );

      expect(result.data).toBeDefined();
    });

    // Test 46
    it('should allow duration less than 6 hours in test environment', async () => {
      configService.get.mockReturnValue('test');
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const endDate = new Date(futureDate.getTime() + 5 * 60 * 1000); // 5 minutes

      electionConfigRepository.findCurrentConfig.mockResolvedValue(null);
      electionConfigRepository.create.mockResolvedValue(
        createMockElectionConfig({
          startDate: futureDate,
          endDate: endDate,
        }),
      );

      const result = await service.setSchedule(
        {
          startDate: futureDate.toISOString(),
          endDate: endDate.toISOString(),
        },
        mockAdminId,
      );

      expect(result.data).toBeDefined();
    });
  });
});
