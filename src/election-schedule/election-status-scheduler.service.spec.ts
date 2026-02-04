import { Test, TestingModule } from '@nestjs/testing';
import { ElectionStatusSchedulerService } from './election-status-scheduler.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { ElectionConfigRepositoryInterface } from './interfaces/election-config.repository.interface';
import { ElectionConfig, ElectionStatus } from './domain/election-config.model';

describe('ElectionStatusSchedulerService', () => {
  let service: ElectionStatusSchedulerService;
  let electionConfigRepository: jest.Mocked<ElectionConfigRepositoryInterface>;
  let auditLogService: jest.Mocked<AuditLogService>;

  const createMockElectionConfig = (
    overrides: Partial<ElectionConfig> = {},
  ): ElectionConfig => {
    return new ElectionConfig({
      id: '123e4567-e89b-12d3-a456-426614174001',
      startDate: new Date('2026-02-10T08:00:00Z'),
      endDate: new Date('2026-02-10T17:00:00Z'),
      status: ElectionStatus.SCHEDULED,
      resultsPublishedAt: null,
      createdBy: 'admin-id',
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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ElectionStatusSchedulerService,
        {
          provide: 'ElectionConfigRepositoryInterface',
          useValue: mockElectionConfigRepository,
        },
        { provide: AuditLogService, useValue: mockAuditLogService },
      ],
    }).compile();

    service = module.get<ElectionStatusSchedulerService>(
      ElectionStatusSchedulerService,
    );
    electionConfigRepository = module.get('ElectionConfigRepositoryInterface');
    auditLogService = module.get(AuditLogService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Positive Tests', () => {
    // Test 1
    it('should transition from SCHEDULED to ACTIVE when start_date reached', async () => {
      const pastStartDate = new Date();
      pastStartDate.setHours(pastStartDate.getHours() - 1);

      const mockConfig = createMockElectionConfig({
        status: ElectionStatus.SCHEDULED,
        startDate: pastStartDate,
        endDate: new Date(pastStartDate.getTime() + 9 * 60 * 60 * 1000),
      });

      electionConfigRepository.findCurrentConfig.mockResolvedValue(mockConfig);
      electionConfigRepository.updateStatus.mockResolvedValue(
        createMockElectionConfig({ status: ElectionStatus.ACTIVE }),
      );

      await service.handleStatusTransition();

      expect(electionConfigRepository.updateStatus).toHaveBeenCalledWith(
        mockConfig.id,
        ElectionStatus.ACTIVE,
      );
      expect(auditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'ELECTION_STATUS_CHANGED',
          details: expect.objectContaining({
            previousStatus: ElectionStatus.SCHEDULED,
            newStatus: ElectionStatus.ACTIVE,
          }),
        }),
      );
    });

    // Test 2
    it('should transition from ACTIVE to CLOSED when end_date reached', async () => {
      const pastEndDate = new Date();
      pastEndDate.setHours(pastEndDate.getHours() - 1);

      const mockConfig = createMockElectionConfig({
        status: ElectionStatus.ACTIVE,
        startDate: new Date(pastEndDate.getTime() - 9 * 60 * 60 * 1000),
        endDate: pastEndDate,
      });

      electionConfigRepository.findCurrentConfig.mockResolvedValue(mockConfig);
      electionConfigRepository.updateStatus.mockResolvedValue(
        createMockElectionConfig({ status: ElectionStatus.CLOSED }),
      );

      await service.handleStatusTransition();

      expect(electionConfigRepository.updateStatus).toHaveBeenCalledWith(
        mockConfig.id,
        ElectionStatus.CLOSED,
      );
      expect(auditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'ELECTION_STATUS_CHANGED',
          details: expect.objectContaining({
            previousStatus: ElectionStatus.ACTIVE,
            newStatus: ElectionStatus.CLOSED,
          }),
        }),
      );
    });

    // Test 3
    it('should not transition when SCHEDULED and start_date not reached', async () => {
      const futureStartDate = new Date();
      futureStartDate.setHours(futureStartDate.getHours() + 1);

      const mockConfig = createMockElectionConfig({
        status: ElectionStatus.SCHEDULED,
        startDate: futureStartDate,
      });

      electionConfigRepository.findCurrentConfig.mockResolvedValue(mockConfig);

      await service.handleStatusTransition();

      expect(electionConfigRepository.updateStatus).not.toHaveBeenCalled();
    });

    // Test 4
    it('should not transition when ACTIVE and end_date not reached', async () => {
      const futureEndDate = new Date();
      futureEndDate.setHours(futureEndDate.getHours() + 1);

      const mockConfig = createMockElectionConfig({
        status: ElectionStatus.ACTIVE,
        endDate: futureEndDate,
      });

      electionConfigRepository.findCurrentConfig.mockResolvedValue(mockConfig);

      await service.handleStatusTransition();

      expect(electionConfigRepository.updateStatus).not.toHaveBeenCalled();
    });

    // Test 5
    it('should not transition when status is CLOSED', async () => {
      const mockConfig = createMockElectionConfig({
        status: ElectionStatus.CLOSED,
      });

      electionConfigRepository.findCurrentConfig.mockResolvedValue(mockConfig);

      await service.handleStatusTransition();

      expect(electionConfigRepository.updateStatus).not.toHaveBeenCalled();
    });

    // Test 6
    it('should not transition when status is PUBLISHED', async () => {
      const mockConfig = createMockElectionConfig({
        status: ElectionStatus.PUBLISHED,
      });

      electionConfigRepository.findCurrentConfig.mockResolvedValue(mockConfig);

      await service.handleStatusTransition();

      expect(electionConfigRepository.updateStatus).not.toHaveBeenCalled();
    });

    // Test 7
    it('should handle no config gracefully', async () => {
      electionConfigRepository.findCurrentConfig.mockResolvedValue(null);

      await service.handleStatusTransition();

      expect(electionConfigRepository.updateStatus).not.toHaveBeenCalled();
      expect(auditLogService.log).not.toHaveBeenCalled();
    });

    // Test 8
    it('should log with actorType SYSTEM', async () => {
      const pastStartDate = new Date();
      pastStartDate.setHours(pastStartDate.getHours() - 1);

      const mockConfig = createMockElectionConfig({
        status: ElectionStatus.SCHEDULED,
        startDate: pastStartDate,
      });

      electionConfigRepository.findCurrentConfig.mockResolvedValue(mockConfig);
      electionConfigRepository.updateStatus.mockResolvedValue(
        createMockElectionConfig({ status: ElectionStatus.ACTIVE }),
      );

      await service.handleStatusTransition();

      expect(auditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actorType: 'SYSTEM',
          actorId: null,
        }),
      );
    });

    // Test 9
    it('should include reason in audit log details', async () => {
      const pastStartDate = new Date();
      pastStartDate.setHours(pastStartDate.getHours() - 1);

      const mockConfig = createMockElectionConfig({
        status: ElectionStatus.SCHEDULED,
        startDate: pastStartDate,
      });

      electionConfigRepository.findCurrentConfig.mockResolvedValue(mockConfig);
      electionConfigRepository.updateStatus.mockResolvedValue(
        createMockElectionConfig({ status: ElectionStatus.ACTIVE }),
      );

      await service.handleStatusTransition();

      expect(auditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({
            reason: expect.stringContaining('Automatic transition'),
          }),
        }),
      );
    });

    // Test 10
    it('should transition at exact start_date time', async () => {
      const now = new Date();

      const mockConfig = createMockElectionConfig({
        status: ElectionStatus.SCHEDULED,
        startDate: now,
        endDate: new Date(now.getTime() + 9 * 60 * 60 * 1000),
      });

      electionConfigRepository.findCurrentConfig.mockResolvedValue(mockConfig);
      electionConfigRepository.updateStatus.mockResolvedValue(
        createMockElectionConfig({ status: ElectionStatus.ACTIVE }),
      );

      await service.handleStatusTransition();

      expect(electionConfigRepository.updateStatus).toHaveBeenCalled();
    });
  });

  describe('Negative Tests', () => {
    // Test 11
    it('should handle repository error gracefully', async () => {
      electionConfigRepository.findCurrentConfig.mockRejectedValue(
        new Error('Database error'),
      );

      // Should not throw
      await expect(service.handleStatusTransition()).resolves.not.toThrow();
    });

    // Test 12
    it('should handle updateStatus error gracefully', async () => {
      const pastStartDate = new Date();
      pastStartDate.setHours(pastStartDate.getHours() - 1);

      const mockConfig = createMockElectionConfig({
        status: ElectionStatus.SCHEDULED,
        startDate: pastStartDate,
      });

      electionConfigRepository.findCurrentConfig.mockResolvedValue(mockConfig);
      electionConfigRepository.updateStatus.mockRejectedValue(
        new Error('Update failed'),
      );

      await expect(service.handleStatusTransition()).resolves.not.toThrow();
    });

    // Test 13
    it('should not double-transition from SCHEDULED to CLOSED', async () => {
      const pastEndDate = new Date();
      pastEndDate.setHours(pastEndDate.getHours() - 1);
      const pastStartDate = new Date(
        pastEndDate.getTime() - 9 * 60 * 60 * 1000,
      );

      const mockConfig = createMockElectionConfig({
        status: ElectionStatus.SCHEDULED,
        startDate: pastStartDate,
        endDate: pastEndDate,
      });

      electionConfigRepository.findCurrentConfig.mockResolvedValue(mockConfig);
      electionConfigRepository.updateStatus.mockResolvedValue(
        createMockElectionConfig({ status: ElectionStatus.ACTIVE }),
      );

      await service.handleStatusTransition();

      // Should only transition to ACTIVE, not directly to CLOSED
      expect(electionConfigRepository.updateStatus).toHaveBeenCalledTimes(1);
      expect(electionConfigRepository.updateStatus).toHaveBeenCalledWith(
        mockConfig.id,
        ElectionStatus.ACTIVE,
      );
    });

    // Test 14
    it('should not call audit log when no transition occurs', async () => {
      const futureStartDate = new Date();
      futureStartDate.setHours(futureStartDate.getHours() + 1);

      const mockConfig = createMockElectionConfig({
        status: ElectionStatus.SCHEDULED,
        startDate: futureStartDate,
      });

      electionConfigRepository.findCurrentConfig.mockResolvedValue(mockConfig);

      await service.handleStatusTransition();

      expect(auditLogService.log).not.toHaveBeenCalled();
    });

    // Test 15
    it('should not call audit log when no config exists', async () => {
      electionConfigRepository.findCurrentConfig.mockResolvedValue(null);

      await service.handleStatusTransition();

      expect(auditLogService.log).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    // Test 16
    it('should handle start_date 1ms in past', async () => {
      const slightlyPastStart = new Date(Date.now() - 1);

      const mockConfig = createMockElectionConfig({
        status: ElectionStatus.SCHEDULED,
        startDate: slightlyPastStart,
      });

      electionConfigRepository.findCurrentConfig.mockResolvedValue(mockConfig);
      electionConfigRepository.updateStatus.mockResolvedValue(
        createMockElectionConfig({ status: ElectionStatus.ACTIVE }),
      );

      await service.handleStatusTransition();

      expect(electionConfigRepository.updateStatus).toHaveBeenCalled();
    });

    // Test 17
    it('should handle end_date 1ms in past when ACTIVE', async () => {
      const slightlyPastEnd = new Date(Date.now() - 1);

      const mockConfig = createMockElectionConfig({
        status: ElectionStatus.ACTIVE,
        endDate: slightlyPastEnd,
      });

      electionConfigRepository.findCurrentConfig.mockResolvedValue(mockConfig);
      electionConfigRepository.updateStatus.mockResolvedValue(
        createMockElectionConfig({ status: ElectionStatus.CLOSED }),
      );

      await service.handleStatusTransition();

      expect(electionConfigRepository.updateStatus).toHaveBeenCalled();
    });

    // Test 18
    it('should handle start_date 1ms in future', async () => {
      const slightlyFutureStart = new Date(Date.now() + 100);

      const mockConfig = createMockElectionConfig({
        status: ElectionStatus.SCHEDULED,
        startDate: slightlyFutureStart,
      });

      electionConfigRepository.findCurrentConfig.mockResolvedValue(mockConfig);

      await service.handleStatusTransition();

      expect(electionConfigRepository.updateStatus).not.toHaveBeenCalled();
    });

    // Test 19
    it('should handle end_date 1ms in future when ACTIVE', async () => {
      const slightlyFutureEnd = new Date(Date.now() + 100);

      const mockConfig = createMockElectionConfig({
        status: ElectionStatus.ACTIVE,
        endDate: slightlyFutureEnd,
      });

      electionConfigRepository.findCurrentConfig.mockResolvedValue(mockConfig);

      await service.handleStatusTransition();

      expect(electionConfigRepository.updateStatus).not.toHaveBeenCalled();
    });

    // Test 20
    it('should preserve config id in all operations', async () => {
      const configId = 'unique-config-id-123';
      const pastStartDate = new Date();
      pastStartDate.setHours(pastStartDate.getHours() - 1);

      const mockConfig = createMockElectionConfig({
        id: configId,
        status: ElectionStatus.SCHEDULED,
        startDate: pastStartDate,
      });

      electionConfigRepository.findCurrentConfig.mockResolvedValue(mockConfig);
      electionConfigRepository.updateStatus.mockResolvedValue(
        createMockElectionConfig({
          id: configId,
          status: ElectionStatus.ACTIVE,
        }),
      );

      await service.handleStatusTransition();

      expect(electionConfigRepository.updateStatus).toHaveBeenCalledWith(
        configId,
        ElectionStatus.ACTIVE,
      );
      expect(auditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          resourceId: configId,
        }),
      );
    });

    // Test 21
    it('should handle very old start_date', async () => {
      const veryOldStart = new Date('2020-01-01T00:00:00Z');

      const mockConfig = createMockElectionConfig({
        status: ElectionStatus.SCHEDULED,
        startDate: veryOldStart,
      });

      electionConfigRepository.findCurrentConfig.mockResolvedValue(mockConfig);
      electionConfigRepository.updateStatus.mockResolvedValue(
        createMockElectionConfig({ status: ElectionStatus.ACTIVE }),
      );

      await service.handleStatusTransition();

      expect(electionConfigRepository.updateStatus).toHaveBeenCalled();
    });

    // Test 22
    it('should handle very old end_date when ACTIVE', async () => {
      const veryOldEnd = new Date('2020-01-01T00:00:00Z');

      const mockConfig = createMockElectionConfig({
        status: ElectionStatus.ACTIVE,
        endDate: veryOldEnd,
      });

      electionConfigRepository.findCurrentConfig.mockResolvedValue(mockConfig);
      electionConfigRepository.updateStatus.mockResolvedValue(
        createMockElectionConfig({ status: ElectionStatus.CLOSED }),
      );

      await service.handleStatusTransition();

      expect(electionConfigRepository.updateStatus).toHaveBeenCalled();
    });

    // Test 23
    it('should handle consecutive calls without issues', async () => {
      electionConfigRepository.findCurrentConfig.mockResolvedValue(null);

      await service.handleStatusTransition();
      await service.handleStatusTransition();
      await service.handleStatusTransition();

      expect(electionConfigRepository.findCurrentConfig).toHaveBeenCalledTimes(
        3,
      );
    });

    // Test 24
    it('should use ELECTION_CONFIG resource type in audit log', async () => {
      const pastStartDate = new Date();
      pastStartDate.setHours(pastStartDate.getHours() - 1);

      const mockConfig = createMockElectionConfig({
        status: ElectionStatus.SCHEDULED,
        startDate: pastStartDate,
      });

      electionConfigRepository.findCurrentConfig.mockResolvedValue(mockConfig);
      electionConfigRepository.updateStatus.mockResolvedValue(
        createMockElectionConfig({ status: ElectionStatus.ACTIVE }),
      );

      await service.handleStatusTransition();

      expect(auditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          resourceType: 'ELECTION_CONFIG',
        }),
      );
    });

    // Test 25
    it('should use SUCCESS status in audit log', async () => {
      const pastStartDate = new Date();
      pastStartDate.setHours(pastStartDate.getHours() - 1);

      const mockConfig = createMockElectionConfig({
        status: ElectionStatus.SCHEDULED,
        startDate: pastStartDate,
      });

      electionConfigRepository.findCurrentConfig.mockResolvedValue(mockConfig);
      electionConfigRepository.updateStatus.mockResolvedValue(
        createMockElectionConfig({ status: ElectionStatus.ACTIVE }),
      );

      await service.handleStatusTransition();

      expect(auditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'SUCCESS',
        }),
      );
    });
  });
});
