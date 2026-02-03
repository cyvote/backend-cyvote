import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AuditLogService } from './audit-log.service';
import { AuditLogLoggerService } from './audit-log-logger.service';
import { AuditLogRequestContextService } from './audit-log-request-context.service';
import { AuditLogRepositoryInterface } from './interfaces/audit-log.repository.interface';
import { AuditAction } from './enums/audit-action.enum';
import { AuditActorType } from './enums/audit-actor-type.enum';
import { AuditResourceType } from './enums/audit-resource-type.enum';
import { AuditStatus } from './enums/audit-status.enum';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';

// Mock the config imports to avoid validation errors
jest.mock('../database/config/database.config', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    url: 'mongodb://localhost:27017',
    type: 'postgres',
    host: 'localhost',
    port: 5432,
    password: 'secret',
    name: 'test',
    username: 'test',
    isDocumentDatabase: false,
    synchronize: false,
    maxQueryExecutionTime: 1000,
    ssl: false,
    rejectUnauthorized: false,
    ca: null,
    key: null,
    cert: null,
  })),
}));

describe('AuditLogService', () => {
  let service: AuditLogService;
  let repository: AuditLogRepositoryInterface;
  let logger: AuditLogLoggerService;
  let requestContextService: AuditLogRequestContextService;
  let configService: ConfigService;

  const mockRepository = {
    create: jest.fn(),
    findMany: jest.fn(),
    findOne: jest.fn(),
    count: jest.fn(),
  };

  const mockLogger = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
  };

  const mockRequestContextService = {
    getContext: jest.fn(),
    run: jest.fn(),
    setContext: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogService,
        {
          provide: 'AuditLogRepositoryInterface',
          useValue: mockRepository,
        },
        {
          provide: AuditLogLoggerService,
          useValue: mockLogger,
        },
        {
          provide: AuditLogRequestContextService,
          useValue: mockRequestContextService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AuditLogService>(AuditLogService);
    repository = module.get('AuditLogRepositoryInterface');
    logger = module.get<AuditLogLoggerService>(AuditLogLoggerService);
    requestContextService = module.get<AuditLogRequestContextService>(
      AuditLogRequestContextService,
    );
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Positive Tests', () => {
    beforeEach(() => {
      mockConfigService.get.mockReturnValue({
        enabled: true,
        databaseEnabled: true,
        logLevel: 'info',
      });
    });

    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should successfully log with all fields', async () => {
      const dto: CreateAuditLogDto = {
        actorId: '123e4567-e89b-12d3-a456-426614174000',
        actorType: AuditActorType.USER,
        action: AuditAction.LOGIN_SUCCESS,
        resourceType: AuditResourceType.USER,
        resourceId: 'user-123',
        status: AuditStatus.SUCCESS,
        details: { ip: '192.168.1.1' },
      };

      mockRequestContextService.getContext.mockReturnValue({
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        userId: '123',
        timestamp: new Date(),
      });

      await service.log(dto);

      // Wait for setImmediate
      await new Promise((resolve) => setImmediate(resolve));

      expect(mockLogger.log).toHaveBeenCalled();
    });

    it('should successfully log with minimum required fields', async () => {
      const dto: CreateAuditLogDto = {
        actorId: null,
        actorType: AuditActorType.ANONYMOUS,
        action: AuditAction.LOGIN_FAILED,
        status: AuditStatus.FAILED,
      };

      await service.log(dto);
      await new Promise((resolve) => setImmediate(resolve));

      expect(mockLogger.log).toHaveBeenCalled();
    });

    it('should log VOTE_CAST with special LUBERJUDIL format', async () => {
      const dto: CreateAuditLogDto = {
        actorId: '123e4567-e89b-12d3-a456-426614174000',
        actorType: AuditActorType.USER,
        action: AuditAction.VOTE_CAST,
        resourceType: AuditResourceType.VOTE,
        resourceId: 'vote-123',
        status: AuditStatus.SUCCESS,
      };

      mockRepository.create.mockResolvedValue({
        id: 1,
        message:
          'User with ID 123e4567-e89b-12d3-a456-426614174000 has successfully voted!',
      });

      await service.log(dto);
      await new Promise((resolve) => setImmediate(resolve));

      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('has successfully voted!'),
        expect.any(Object),
      );
    });

    it('should log LOGIN_SUCCESS action', async () => {
      const dto: CreateAuditLogDto = {
        actorId: 'user-123',
        actorType: AuditActorType.USER,
        action: AuditAction.LOGIN_SUCCESS,
        status: AuditStatus.SUCCESS,
      };

      await service.log(dto);
      await new Promise((resolve) => setImmediate(resolve));

      expect(mockLogger.log).toHaveBeenCalled();
    });

    it('should log LOGIN_FAILED action', async () => {
      const dto: CreateAuditLogDto = {
        actorId: 'user-123',
        actorType: AuditActorType.USER,
        action: AuditAction.LOGIN_FAILED,
        status: AuditStatus.FAILED,
        details: { reason: 'Invalid password' },
      };

      await service.log(dto);
      await new Promise((resolve) => setImmediate(resolve));

      expect(mockLogger.log).toHaveBeenCalled();
    });

    it('should log VOTER_CREATED action', async () => {
      const dto: CreateAuditLogDto = {
        actorId: 'admin-123',
        actorType: AuditActorType.ADMIN,
        action: AuditAction.VOTER_CREATED,
        resourceType: AuditResourceType.VOTER,
        resourceId: 'voter-456',
        status: AuditStatus.SUCCESS,
      };

      await service.log(dto);
      await new Promise((resolve) => setImmediate(resolve));

      expect(mockLogger.log).toHaveBeenCalled();
    });

    it('should log VOTER_UPDATED action', async () => {
      const dto: CreateAuditLogDto = {
        actorId: 'admin-123',
        actorType: AuditActorType.ADMIN,
        action: AuditAction.VOTER_UPDATED,
        status: AuditStatus.SUCCESS,
      };

      await service.log(dto);
      await new Promise((resolve) => setImmediate(resolve));

      expect(mockLogger.log).toHaveBeenCalled();
    });

    it('should log VOTER_DELETED action', async () => {
      const dto: CreateAuditLogDto = {
        actorId: 'admin-123',
        actorType: AuditActorType.ADMIN,
        action: AuditAction.VOTER_DELETED,
        status: AuditStatus.SUCCESS,
      };

      await service.log(dto);
      await new Promise((resolve) => setImmediate(resolve));

      expect(mockLogger.log).toHaveBeenCalled();
    });

    it('should log VOTER_BULK_IMPORTED action', async () => {
      const dto: CreateAuditLogDto = {
        actorId: 'admin-123',
        actorType: AuditActorType.ADMIN,
        action: AuditAction.VOTER_BULK_IMPORTED,
        status: AuditStatus.SUCCESS,
        details: { count: 100 },
      };

      await service.log(dto);
      await new Promise((resolve) => setImmediate(resolve));

      expect(mockLogger.log).toHaveBeenCalled();
    });

    it('should log CANDIDATE_CREATED action', async () => {
      const dto: CreateAuditLogDto = {
        actorId: 'admin-123',
        actorType: AuditActorType.ADMIN,
        action: AuditAction.CANDIDATE_CREATED,
        status: AuditStatus.SUCCESS,
      };

      await service.log(dto);
      await new Promise((resolve) => setImmediate(resolve));

      expect(mockLogger.log).toHaveBeenCalled();
    });

    it('should log TOKEN_GENERATED action', async () => {
      const dto: CreateAuditLogDto = {
        actorId: 'system',
        actorType: AuditActorType.SYSTEM,
        action: AuditAction.TOKEN_GENERATED,
        status: AuditStatus.SUCCESS,
      };

      await service.log(dto);
      await new Promise((resolve) => setImmediate(resolve));

      expect(mockLogger.log).toHaveBeenCalled();
    });

    it('should log ELECTION_SCHEDULED action', async () => {
      const dto: CreateAuditLogDto = {
        actorId: 'admin-123',
        actorType: AuditActorType.ADMIN,
        action: AuditAction.ELECTION_SCHEDULED,
        status: AuditStatus.SUCCESS,
      };

      await service.log(dto);
      await new Promise((resolve) => setImmediate(resolve));

      expect(mockLogger.log).toHaveBeenCalled();
    });

    it('should log RESULTS_PUBLISHED action', async () => {
      const dto: CreateAuditLogDto = {
        actorId: 'admin-123',
        actorType: AuditActorType.ADMIN,
        action: AuditAction.RESULTS_PUBLISHED,
        status: AuditStatus.SUCCESS,
      };

      await service.log(dto);
      await new Promise((resolve) => setImmediate(resolve));

      expect(mockLogger.log).toHaveBeenCalled();
    });

    it('should retrieve request context from AsyncLocalStorage', async () => {
      const mockContext = {
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        userId: 'user-123',
        timestamp: new Date(),
      };

      mockRequestContextService.getContext.mockReturnValue(mockContext);

      const dto: CreateAuditLogDto = {
        actorId: 'user-123',
        actorType: AuditActorType.USER,
        action: AuditAction.LOGIN_SUCCESS,
        status: AuditStatus.SUCCESS,
      };

      await service.log(dto);
      await new Promise((resolve) => setImmediate(resolve));

      expect(mockRequestContextService.getContext).toHaveBeenCalled();
    });

    it('should successfully query logs with filters', async () => {
      const mockLogs = [
        {
          id: 1,
          actorId: 'user-123',
          action: AuditAction.LOGIN_SUCCESS,
        },
      ];
      mockRepository.findMany.mockResolvedValue(mockLogs);

      const result = await service.findMany({
        actorId: 'user-123',
      });

      expect(result).toEqual(mockLogs);
      expect(mockRepository.findMany).toHaveBeenCalledWith({
        actorId: 'user-123',
      });
    });

    it('should successfully find one log by id', async () => {
      const mockLog = {
        id: 1,
        actorId: 'user-123',
        action: AuditAction.LOGIN_SUCCESS,
      };
      mockRepository.findOne.mockResolvedValue(mockLog);

      const result = await service.findOne(1);

      expect(result).toEqual(mockLog);
      expect(mockRepository.findOne).toHaveBeenCalledWith(1);
    });

    it('should successfully count logs', async () => {
      mockRepository.count.mockResolvedValue(100);

      const result = await service.count({
        actorId: 'user-123',
      });

      expect(result).toBe(100);
      expect(mockRepository.count).toHaveBeenCalledWith({
        actorId: 'user-123',
      });
    });

    it('should save to database when enabled', async () => {
      mockConfigService.get.mockReturnValue({
        enabled: true,
        databaseEnabled: true,
      });

      const dto: CreateAuditLogDto = {
        actorId: 'user-123',
        actorType: AuditActorType.USER,
        action: AuditAction.LOGIN_SUCCESS,
        status: AuditStatus.SUCCESS,
      };

      mockRepository.create.mockResolvedValue({ id: 1 });

      await service.log(dto);
      await new Promise((resolve) => setImmediate(resolve));

      expect(mockRepository.create).toHaveBeenCalled();
    });

    it('should handle ADMIN actor type', async () => {
      const dto: CreateAuditLogDto = {
        actorId: 'admin-123',
        actorType: AuditActorType.ADMIN,
        action: AuditAction.VOTER_CREATED,
        status: AuditStatus.SUCCESS,
      };

      await service.log(dto);
      await new Promise((resolve) => setImmediate(resolve));

      expect(mockLogger.log).toHaveBeenCalled();
    });

    it('should handle SYSTEM actor type', async () => {
      const dto: CreateAuditLogDto = {
        actorId: null,
        actorType: AuditActorType.SYSTEM,
        action: AuditAction.TOKEN_GENERATED,
        status: AuditStatus.SUCCESS,
      };

      await service.log(dto);
      await new Promise((resolve) => setImmediate(resolve));

      expect(mockLogger.log).toHaveBeenCalled();
    });

    it('should handle ANONYMOUS actor type', async () => {
      const dto: CreateAuditLogDto = {
        actorId: null,
        actorType: AuditActorType.ANONYMOUS,
        action: AuditAction.LOGIN_FAILED,
        status: AuditStatus.FAILED,
      };

      await service.log(dto);
      await new Promise((resolve) => setImmediate(resolve));

      expect(mockLogger.log).toHaveBeenCalled();
    });

    it('should log with complex details object', async () => {
      const dto: CreateAuditLogDto = {
        actorId: 'user-123',
        actorType: AuditActorType.USER,
        action: AuditAction.VOTER_BULK_IMPORTED,
        status: AuditStatus.SUCCESS,
        details: {
          totalCount: 100,
          successCount: 95,
          failedCount: 5,
          errors: ['Duplicate email', 'Invalid phone'],
        },
      };

      await service.log(dto);
      await new Promise((resolve) => setImmediate(resolve));

      expect(mockLogger.log).toHaveBeenCalled();
    });

    it('should handle SUCCESS status', async () => {
      const dto: CreateAuditLogDto = {
        actorId: 'user-123',
        actorType: AuditActorType.USER,
        action: AuditAction.LOGIN_SUCCESS,
        status: AuditStatus.SUCCESS,
      };

      await service.log(dto);
      await new Promise((resolve) => setImmediate(resolve));

      expect(mockLogger.log).toHaveBeenCalled();
    });

    it('should handle FAILED status', async () => {
      const dto: CreateAuditLogDto = {
        actorId: 'user-123',
        actorType: AuditActorType.USER,
        action: AuditAction.LOGIN_FAILED,
        status: AuditStatus.FAILED,
      };

      await service.log(dto);
      await new Promise((resolve) => setImmediate(resolve));

      expect(mockLogger.log).toHaveBeenCalled();
    });

    it('should handle PENDING status', async () => {
      const dto: CreateAuditLogDto = {
        actorId: 'user-123',
        actorType: AuditActorType.USER,
        action: AuditAction.TOKEN_GENERATED,
        status: AuditStatus.PENDING,
      };

      await service.log(dto);
      await new Promise((resolve) => setImmediate(resolve));

      expect(mockLogger.log).toHaveBeenCalled();
    });

    it('should log ADMIN_LOGOUT action', async () => {
      const dto: CreateAuditLogDto = {
        actorId: 'admin-123',
        actorType: AuditActorType.ADMIN,
        action: AuditAction.ADMIN_LOGOUT,
        status: AuditStatus.SUCCESS,
      };

      await service.log(dto);
      await new Promise((resolve) => setImmediate(resolve));

      expect(mockLogger.log).toHaveBeenCalled();
    });

    it('should log EXPORT_NON_VOTERS action', async () => {
      const dto: CreateAuditLogDto = {
        actorId: 'admin-123',
        actorType: AuditActorType.ADMIN,
        action: AuditAction.EXPORT_NON_VOTERS,
        status: AuditStatus.SUCCESS,
      };

      await service.log(dto);
      await new Promise((resolve) => setImmediate(resolve));

      expect(mockLogger.log).toHaveBeenCalled();
    });

    it('should handle all resource types', async () => {
      const resourceTypes = [
        AuditResourceType.USER,
        AuditResourceType.VOTER,
        AuditResourceType.CANDIDATE,
        AuditResourceType.VOTE,
        AuditResourceType.TOKEN,
      ];

      for (const resourceType of resourceTypes) {
        const dto: CreateAuditLogDto = {
          actorId: 'user-123',
          actorType: AuditActorType.USER,
          action: AuditAction.LOGIN_SUCCESS,
          resourceType,
          status: AuditStatus.SUCCESS,
        };

        await service.log(dto);
        await new Promise((resolve) => setImmediate(resolve));
      }

      expect(mockLogger.log).toHaveBeenCalledTimes(resourceTypes.length);
    });

    it('should be non-blocking (fire and forget)', async () => {
      const dto: CreateAuditLogDto = {
        actorId: 'user-123',
        actorType: AuditActorType.USER,
        action: AuditAction.LOGIN_SUCCESS,
        status: AuditStatus.SUCCESS,
      };

      const startTime = Date.now();
      await service.log(dto);
      const endTime = Date.now();

      // Should return immediately (less than 10ms)
      expect(endTime - startTime).toBeLessThan(10);
    });
  });

  describe('Negative Tests', () => {
    beforeEach(() => {
      mockConfigService.get.mockReturnValue({
        enabled: true,
        databaseEnabled: true,
        logLevel: 'info',
      });
    });

    it('should return immediately when audit logging is disabled', async () => {
      mockConfigService.get.mockReturnValueOnce({
        enabled: false,
      });

      const dto: CreateAuditLogDto = {
        actorId: 'user-123',
        actorType: AuditActorType.USER,
        action: AuditAction.LOGIN_SUCCESS,
        status: AuditStatus.SUCCESS,
      };

      const startTime = Date.now();
      await service.log(dto);
      const endTime = Date.now();

      // Should return immediately without waiting for async operations
      expect(endTime - startTime).toBeLessThan(5);
      expect(mockConfigService.get).toHaveBeenCalledWith('auditLog', {
        infer: true,
      });
    });

    it('should handle null actorId gracefully', async () => {
      mockConfigService.get.mockReturnValue({
        enabled: true,
        databaseEnabled: true,
      });

      const dto: CreateAuditLogDto = {
        actorId: null,
        actorType: AuditActorType.ANONYMOUS,
        action: AuditAction.LOGIN_FAILED,
        status: AuditStatus.FAILED,
      };

      await service.log(dto);
      await new Promise((resolve) => setImmediate(resolve));

      expect(mockLogger.log).toHaveBeenCalled();
    });

    it('should handle database connection error', async () => {
      mockConfigService.get.mockReturnValue({
        enabled: true,
        databaseEnabled: true,
      });

      mockRepository.create.mockRejectedValue(
        new Error('Database connection failed'),
      );

      const dto: CreateAuditLogDto = {
        actorId: 'user-123',
        actorType: AuditActorType.USER,
        action: AuditAction.LOGIN_SUCCESS,
        status: AuditStatus.SUCCESS,
      };

      await service.log(dto);
      await new Promise((resolve) => setImmediate(resolve));

      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle Winston logger error', async () => {
      mockConfigService.get.mockReturnValue({
        enabled: true,
        databaseEnabled: false,
      });

      mockLogger.log.mockImplementation(() => {
        throw new Error('Logger error');
      });

      const dto: CreateAuditLogDto = {
        actorId: 'user-123',
        actorType: AuditActorType.USER,
        action: AuditAction.LOGIN_SUCCESS,
        status: AuditStatus.SUCCESS,
      };

      await service.log(dto);
      await new Promise((resolve) => setImmediate(resolve));

      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle repository error gracefully', async () => {
      mockConfigService.get.mockReturnValue({
        enabled: true,
        databaseEnabled: true,
      });

      mockRepository.create.mockRejectedValue(new Error('Repository error'));

      const dto: CreateAuditLogDto = {
        actorId: 'user-123',
        actorType: AuditActorType.USER,
        action: AuditAction.LOGIN_SUCCESS,
        status: AuditStatus.SUCCESS,
      };

      await service.log(dto);
      await new Promise((resolve) => setImmediate(resolve));

      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle missing request context', async () => {
      mockConfigService.get.mockReturnValue({
        enabled: true,
        databaseEnabled: true,
      });

      mockRequestContextService.getContext.mockReturnValue(undefined);

      const dto: CreateAuditLogDto = {
        actorId: 'user-123',
        actorType: AuditActorType.USER,
        action: AuditAction.LOGIN_SUCCESS,
        status: AuditStatus.SUCCESS,
      };

      await service.log(dto);
      await new Promise((resolve) => setImmediate(resolve));

      expect(mockLogger.log).toHaveBeenCalled();
    });

    it('should not throw on invalid details object', async () => {
      mockConfigService.get.mockReturnValue({
        enabled: true,
        databaseEnabled: true,
      });

      const dto: CreateAuditLogDto = {
        actorId: 'user-123',
        actorType: AuditActorType.USER,
        action: AuditAction.LOGIN_SUCCESS,
        status: AuditStatus.SUCCESS,
        details: { circular: null } as any,
      };
      // Create circular reference
      (dto.details as any).circular = dto.details;

      await service.log(dto);
      await new Promise((resolve) => setImmediate(resolve));

      expect(mockLogger.log).toHaveBeenCalled();
    });

    it('should handle undefined details', async () => {
      mockConfigService.get.mockReturnValue({
        enabled: true,
        databaseEnabled: true,
      });

      const dto: CreateAuditLogDto = {
        actorId: 'user-123',
        actorType: AuditActorType.USER,
        action: AuditAction.LOGIN_SUCCESS,
        status: AuditStatus.SUCCESS,
        details: undefined,
      };

      await service.log(dto);
      await new Promise((resolve) => setImmediate(resolve));

      expect(mockLogger.log).toHaveBeenCalled();
    });

    it('should sanitize sensitive data from details', async () => {
      mockConfigService.get.mockReturnValue({
        enabled: true,
        databaseEnabled: true,
      });

      const dto: CreateAuditLogDto = {
        actorId: 'user-123',
        actorType: AuditActorType.USER,
        action: AuditAction.LOGIN_SUCCESS,
        status: AuditStatus.SUCCESS,
        details: {
          password: 'secret123',
          token: 'jwt-token',
          username: 'john',
        },
      };

      mockRepository.create.mockImplementation((data) => {
        expect(data.details).not.toHaveProperty('password');
        expect(data.details).not.toHaveProperty('token');
        return Promise.resolve(data);
      });

      await service.log(dto);
      await new Promise((resolve) => setImmediate(resolve));
    });

    it('should handle extremely large details object', async () => {
      mockConfigService.get.mockReturnValue({
        enabled: true,
        databaseEnabled: true,
      });

      const largeDetails = {
        data: 'x'.repeat(20000), // 20KB
      };

      const dto: CreateAuditLogDto = {
        actorId: 'user-123',
        actorType: AuditActorType.USER,
        action: AuditAction.LOGIN_SUCCESS,
        status: AuditStatus.SUCCESS,
        details: largeDetails,
      };

      mockRepository.create.mockImplementation((data) => {
        expect(data.details).toHaveProperty('_truncated');
        return Promise.resolve(data);
      });

      await service.log(dto);
      await new Promise((resolve) => setImmediate(resolve));
    });

    it('should handle findMany with no results', async () => {
      mockRepository.findMany.mockResolvedValue([]);

      const result = await service.findMany({
        actorId: 'non-existent',
      });

      expect(result).toEqual([]);
    });

    it('should handle findOne with non-existent id', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.findOne(999999);

      expect(result).toBeNull();
    });

    it('should handle count with zero results', async () => {
      mockRepository.count.mockResolvedValue(0);

      const result = await service.count({
        actorId: 'non-existent',
      });

      expect(result).toBe(0);
    });

    it('should handle repository findMany error', async () => {
      mockRepository.findMany.mockRejectedValue(new Error('Database error'));

      await expect(
        service.findMany({ actorId: 'user-123' }),
      ).rejects.toThrow('Database error');
    });

    it('should handle repository findOne error', async () => {
      mockRepository.findOne.mockRejectedValue(new Error('Database error'));

      await expect(service.findOne(1)).rejects.toThrow('Database error');
    });

    it('should handle repository count error', async () => {
      mockRepository.count.mockRejectedValue(new Error('Database error'));

      await expect(service.count({ actorId: 'user-123' })).rejects.toThrow(
        'Database error',
      );
    });

    it('should not save to database when disabled', async () => {
      mockConfigService.get.mockReturnValue({
        enabled: true,
        databaseEnabled: false,
      });

      const dto: CreateAuditLogDto = {
        actorId: 'user-123',
        actorType: AuditActorType.USER,
        action: AuditAction.LOGIN_SUCCESS,
        status: AuditStatus.SUCCESS,
      };

      await service.log(dto);
      await new Promise((resolve) => setImmediate(resolve));

      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('should handle null resourceType', async () => {
      mockConfigService.get.mockReturnValue({
        enabled: true,
        databaseEnabled: true,
      });

      const dto: CreateAuditLogDto = {
        actorId: 'user-123',
        actorType: AuditActorType.USER,
        action: AuditAction.LOGIN_SUCCESS,
        resourceType: null,
        status: AuditStatus.SUCCESS,
      };

      await service.log(dto);
      await new Promise((resolve) => setImmediate(resolve));

      expect(mockLogger.log).toHaveBeenCalled();
    });

    it('should handle null resourceId', async () => {
      mockConfigService.get.mockReturnValue({
        enabled: true,
        databaseEnabled: true,
      });

      const dto: CreateAuditLogDto = {
        actorId: 'user-123',
        actorType: AuditActorType.USER,
        action: AuditAction.LOGIN_SUCCESS,
        resourceId: null,
        status: AuditStatus.SUCCESS,
      };

      await service.log(dto);
      await new Promise((resolve) => setImmediate(resolve));

      expect(mockLogger.log).toHaveBeenCalled();
    });

    it('should handle null config', async () => {
      mockConfigService.get.mockReturnValue(null);

      const dto: CreateAuditLogDto = {
        actorId: 'user-123',
        actorType: AuditActorType.USER,
        action: AuditAction.LOGIN_SUCCESS,
        status: AuditStatus.SUCCESS,
      };

      await service.log(dto);
      await new Promise((resolve) => setImmediate(resolve));

      expect(mockLogger.log).not.toHaveBeenCalled();
    });

    it('should handle malformed date in filters', async () => {
      mockRepository.findMany.mockResolvedValue([]);

      const result = await service.findMany({
        createdFrom: new Date('invalid'),
      });

      expect(mockRepository.findMany).toHaveBeenCalled();
    });

    it('should handle negative page number in filters', async () => {
      mockRepository.findMany.mockResolvedValue([]);

      const result = await service.findMany({
        page: -1,
      });

      expect(mockRepository.findMany).toHaveBeenCalled();
    });

    it('should handle zero limit in filters', async () => {
      mockRepository.findMany.mockResolvedValue([]);

      const result = await service.findMany({
        limit: 0,
      });

      expect(mockRepository.findMany).toHaveBeenCalled();
    });

    it('should handle all sensitive field names', async () => {
      mockConfigService.get.mockReturnValue({
        enabled: true,
        databaseEnabled: true,
      });

      const dto: CreateAuditLogDto = {
        actorId: 'user-123',
        actorType: AuditActorType.USER,
        action: AuditAction.LOGIN_SUCCESS,
        status: AuditStatus.SUCCESS,
        details: {
          password: 'secret',
          token: 'jwt',
          secret: 'key',
          apiKey: 'api-key',
          accessToken: 'access',
          refreshToken: 'refresh',
          privateKey: 'private',
          creditCard: '1234',
          ssn: '123-45-6789',
          cvv: '123',
          normalField: 'value',
        },
      };

      mockRepository.create.mockImplementation((data) => {
        expect(data.details).toHaveProperty('normalField');
        expect(data.details).not.toHaveProperty('password');
        expect(data.details).not.toHaveProperty('token');
        expect(data.details).not.toHaveProperty('secret');
        expect(data.details).not.toHaveProperty('apiKey');
        return Promise.resolve(data);
      });

      await service.log(dto);
      await new Promise((resolve) => setImmediate(resolve));
    });

    it('should handle actor ID with special characters', async () => {
      mockConfigService.get.mockReturnValue({
        enabled: true,
        databaseEnabled: true,
      });

      const dto: CreateAuditLogDto = {
        actorId: "user-123'; DROP TABLE users;--",
        actorType: AuditActorType.USER,
        action: AuditAction.LOGIN_SUCCESS,
        status: AuditStatus.SUCCESS,
      };

      await service.log(dto);
      await new Promise((resolve) => setImmediate(resolve));

      expect(mockLogger.log).toHaveBeenCalled();
    });

    it('should handle XSS attempt in details', async () => {
      mockConfigService.get.mockReturnValue({
        enabled: true,
        databaseEnabled: true,
      });

      const dto: CreateAuditLogDto = {
        actorId: 'user-123',
        actorType: AuditActorType.USER,
        action: AuditAction.LOGIN_SUCCESS,
        status: AuditStatus.SUCCESS,
        details: {
          comment: '<script>alert("XSS")</script>',
        },
      };

      await service.log(dto);
      await new Promise((resolve) => setImmediate(resolve));

      expect(mockLogger.log).toHaveBeenCalled();
    });

    it('should handle null in details fields', async () => {
      mockConfigService.get.mockReturnValue({
        enabled: true,
        databaseEnabled: true,
      });

      const dto: CreateAuditLogDto = {
        actorId: 'user-123',
        actorType: AuditActorType.USER,
        action: AuditAction.LOGIN_SUCCESS,
        status: AuditStatus.SUCCESS,
        details: {
          field1: null,
          field2: undefined,
          field3: 'value',
        },
      };

      await service.log(dto);
      await new Promise((resolve) => setImmediate(resolve));

      expect(mockLogger.log).toHaveBeenCalled();
    });
  });

  describe('Edge Case Tests', () => {
    beforeEach(() => {
      mockConfigService.get.mockReturnValue({
        enabled: true,
        databaseEnabled: true,
        logLevel: 'info',
      });
    });

    it('should handle empty details object', async () => {
      const dto: CreateAuditLogDto = {
        actorId: 'user-123',
        actorType: AuditActorType.USER,
        action: AuditAction.LOGIN_SUCCESS,
        status: AuditStatus.SUCCESS,
        details: {},
      };

      await service.log(dto);
      await new Promise((resolve) => setImmediate(resolve));

      expect(mockLogger.log).toHaveBeenCalled();
    });

    it('should handle null details', async () => {
      const dto: CreateAuditLogDto = {
        actorId: 'user-123',
        actorType: AuditActorType.USER,
        action: AuditAction.LOGIN_SUCCESS,
        status: AuditStatus.SUCCESS,
        details: null,
      };

      await service.log(dto);
      await new Promise((resolve) => setImmediate(resolve));

      expect(mockLogger.log).toHaveBeenCalled();
    });

    it('should handle extremely long actorId', async () => {
      const longId = 'a'.repeat(1000);
      const dto: CreateAuditLogDto = {
        actorId: longId,
        actorType: AuditActorType.USER,
        action: AuditAction.LOGIN_SUCCESS,
        status: AuditStatus.SUCCESS,
      };

      await service.log(dto);
      await new Promise((resolve) => setImmediate(resolve));

      expect(mockLogger.log).toHaveBeenCalled();
    });

    it('should handle Unicode characters in actorId', async () => {
      const dto: CreateAuditLogDto = {
        actorId: '用户-123-مستخدم-🚀',
        actorType: AuditActorType.USER,
        action: AuditAction.LOGIN_SUCCESS,
        status: AuditStatus.SUCCESS,
      };

      await service.log(dto);
      await new Promise((resolve) => setImmediate(resolve));

      expect(mockLogger.log).toHaveBeenCalled();
    });

    it('should handle partial request context', async () => {
      mockRequestContextService.getContext.mockReturnValue({
        ipAddress: '192.168.1.1',
        userAgent: null,
        userId: null,
        timestamp: new Date(),
      });

      const dto: CreateAuditLogDto = {
        actorId: 'user-123',
        actorType: AuditActorType.USER,
        action: AuditAction.LOGIN_SUCCESS,
        status: AuditStatus.SUCCESS,
      };

      await service.log(dto);
      await new Promise((resolve) => setImmediate(resolve));

      expect(mockLogger.log).toHaveBeenCalled();
    });

    it('should handle concurrent logging (race condition)', async () => {
      const promises: Promise<void>[] = [];
      for (let i = 0; i < 10; i++) {
        const dto: CreateAuditLogDto = {
          actorId: `user-${i}`,
          actorType: AuditActorType.USER,
          action: AuditAction.LOGIN_SUCCESS,
          status: AuditStatus.SUCCESS,
        };
        promises.push(service.log(dto));
      }

      await Promise.all(promises);
      await new Promise((resolve) => setImmediate(resolve));

      expect(mockLogger.log).toHaveBeenCalledTimes(10);
    });

    it('should handle maximum field lengths', async () => {
      const dto: CreateAuditLogDto = {
        actorId: 'a'.repeat(255),
        actorType: AuditActorType.USER,
        action: AuditAction.LOGIN_SUCCESS,
        resourceId: 'b'.repeat(255),
        status: AuditStatus.SUCCESS,
      };

      await service.log(dto);
      await new Promise((resolve) => setImmediate(resolve));

      expect(mockLogger.log).toHaveBeenCalled();
    });

    it('should handle nested objects in details', async () => {
      const dto: CreateAuditLogDto = {
        actorId: 'user-123',
        actorType: AuditActorType.USER,
        action: AuditAction.LOGIN_SUCCESS,
        status: AuditStatus.SUCCESS,
        details: {
          level1: {
            level2: {
              level3: {
                value: 'deep',
              },
            },
          },
        },
      };

      await service.log(dto);
      await new Promise((resolve) => setImmediate(resolve));

      expect(mockLogger.log).toHaveBeenCalled();
    });

    it('should handle arrays in details', async () => {
      const dto: CreateAuditLogDto = {
        actorId: 'user-123',
        actorType: AuditActorType.USER,
        action: AuditAction.VOTER_BULK_IMPORTED,
        status: AuditStatus.SUCCESS,
        details: {
          voters: ['voter1', 'voter2', 'voter3'],
          errors: [],
        },
      };

      await service.log(dto);
      await new Promise((resolve) => setImmediate(resolve));

      expect(mockLogger.log).toHaveBeenCalled();
    });

    it('should handle database disabled with logger enabled', async () => {
      mockConfigService.get.mockReturnValue({
        enabled: true,
        databaseEnabled: false,
      });

      const dto: CreateAuditLogDto = {
        actorId: 'user-123',
        actorType: AuditActorType.USER,
        action: AuditAction.LOGIN_SUCCESS,
        status: AuditStatus.SUCCESS,
      };

      await service.log(dto);
      await new Promise((resolve) => setImmediate(resolve));

      expect(mockLogger.log).toHaveBeenCalled();
      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('should handle query with empty filters', async () => {
      mockRepository.findMany.mockResolvedValue([]);

      const result = await service.findMany({});

      expect(mockRepository.findMany).toHaveBeenCalledWith({});
    });

    it('should handle query with invalid pagination', async () => {
      mockRepository.findMany.mockResolvedValue([]);

      const result = await service.findMany({
        page: -999,
        limit: -999,
      });

      expect(mockRepository.findMany).toHaveBeenCalled();
    });

    it('should handle query with extreme pagination', async () => {
      mockRepository.findMany.mockResolvedValue([]);

      const result = await service.findMany({
        page: 999999,
        limit: 1000,
      });

      expect(mockRepository.findMany).toHaveBeenCalled();
    });

    it('should handle VOTE_CAST with null actorId', async () => {
      const dto: CreateAuditLogDto = {
        actorId: null,
        actorType: AuditActorType.ANONYMOUS,
        action: AuditAction.VOTE_CAST,
        status: AuditStatus.SUCCESS,
      };

      await service.log(dto);
      await new Promise((resolve) => setImmediate(resolve));

      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('unknown'),
        expect.any(Object),
      );
    });

    it('should handle future timestamp in context', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 10);

      mockRequestContextService.getContext.mockReturnValue({
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        userId: 'user-123',
        timestamp: futureDate,
      });

      const dto: CreateAuditLogDto = {
        actorId: 'user-123',
        actorType: AuditActorType.USER,
        action: AuditAction.LOGIN_SUCCESS,
        status: AuditStatus.SUCCESS,
      };

      await service.log(dto);
      await new Promise((resolve) => setImmediate(resolve));

      expect(mockLogger.log).toHaveBeenCalled();
    });

    it('should handle past timestamp (year 1970)', async () => {
      mockRequestContextService.getContext.mockReturnValue({
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        userId: 'user-123',
        timestamp: new Date(0),
      });

      const dto: CreateAuditLogDto = {
        actorId: 'user-123',
        actorType: AuditActorType.USER,
        action: AuditAction.LOGIN_SUCCESS,
        status: AuditStatus.SUCCESS,
      };

      await service.log(dto);
      await new Promise((resolve) => setImmediate(resolve));

      expect(mockLogger.log).toHaveBeenCalled();
    });

    it('should handle date range query with same dates', async () => {
      const date = new Date();
      mockRepository.findMany.mockResolvedValue([]);

      const result = await service.findMany({
        createdFrom: date,
        createdTo: date,
      });

      expect(mockRepository.findMany).toHaveBeenCalled();
    });

    it('should handle date range query with reversed dates', async () => {
      const date1 = new Date('2024-01-01');
      const date2 = new Date('2023-01-01');
      mockRepository.findMany.mockResolvedValue([]);

      const result = await service.findMany({
        createdFrom: date1,
        createdTo: date2,
      });

      expect(mockRepository.findMany).toHaveBeenCalled();
    });

    it('should handle all action types sequentially', async () => {
      const actions = Object.values(AuditAction);

      for (const action of actions) {
        const dto: CreateAuditLogDto = {
          actorId: 'user-123',
          actorType: AuditActorType.USER,
          action,
          status: AuditStatus.SUCCESS,
        };

        await service.log(dto);
        await new Promise((resolve) => setImmediate(resolve));
      }

      expect(mockLogger.log).toHaveBeenCalledTimes(actions.length);
    });

    it('should handle IP address with IPv6 format', async () => {
      mockRequestContextService.getContext.mockReturnValue({
        ipAddress: '2001:0db8:85a3:0000:0000:8a2e:0370:7334',
        userAgent: 'Mozilla/5.0',
        userId: 'user-123',
        timestamp: new Date(),
      });

      const dto: CreateAuditLogDto = {
        actorId: 'user-123',
        actorType: AuditActorType.USER,
        action: AuditAction.LOGIN_SUCCESS,
        status: AuditStatus.SUCCESS,
      };

      await service.log(dto);
      await new Promise((resolve) => setImmediate(resolve));

      expect(mockLogger.log).toHaveBeenCalled();
    });

    it('should handle extremely long user agent string', async () => {
      mockRequestContextService.getContext.mockReturnValue({
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 ' + 'a'.repeat(2000),
        userId: 'user-123',
        timestamp: new Date(),
      });

      const dto: CreateAuditLogDto = {
        actorId: 'user-123',
        actorType: AuditActorType.USER,
        action: AuditAction.LOGIN_SUCCESS,
        status: AuditStatus.SUCCESS,
      };

      await service.log(dto);
      await new Promise((resolve) => setImmediate(resolve));

      expect(mockLogger.log).toHaveBeenCalled();
    });

    it('should handle query with all filters applied', async () => {
      mockRepository.findMany.mockResolvedValue([]);

      const result = await service.findMany({
        actorId: 'user-123',
        actorType: AuditActorType.USER,
        action: AuditAction.LOGIN_SUCCESS,
        resourceType: AuditResourceType.USER,
        resourceId: 'resource-123',
        status: AuditStatus.SUCCESS,
        ipAddress: '192.168.1.1',
        createdFrom: new Date('2024-01-01'),
        createdTo: new Date('2024-12-31'),
        page: 1,
        limit: 20,
      });

      expect(mockRepository.findMany).toHaveBeenCalled();
    });

    it('should handle boolean values in details', async () => {
      const dto: CreateAuditLogDto = {
        actorId: 'user-123',
        actorType: AuditActorType.USER,
        action: AuditAction.LOGIN_SUCCESS,
        status: AuditStatus.SUCCESS,
        details: {
          isAdmin: true,
          isVerified: false,
          hasAccess: true,
        },
      };

      await service.log(dto);
      await new Promise((resolve) => setImmediate(resolve));

      expect(mockLogger.log).toHaveBeenCalled();
    });

    it('should handle numeric values in details', async () => {
      const dto: CreateAuditLogDto = {
        actorId: 'user-123',
        actorType: AuditActorType.USER,
        action: AuditAction.VOTER_BULK_IMPORTED,
        status: AuditStatus.SUCCESS,
        details: {
          count: 100,
          successRate: 0.95,
          duration: 1234.56,
          attempts: 0,
        },
      };

      await service.log(dto);
      await new Promise((resolve) => setImmediate(resolve));

      expect(mockLogger.log).toHaveBeenCalled();
    });

    it('should handle Date objects in details', async () => {
      const dto: CreateAuditLogDto = {
        actorId: 'user-123',
        actorType: AuditActorType.USER,
        action: AuditAction.LOGIN_SUCCESS,
        status: AuditStatus.SUCCESS,
        details: {
          loginTime: new Date(),
          expiresAt: new Date(Date.now() + 86400000),
        },
      };

      await service.log(dto);
      await new Promise((resolve) => setImmediate(resolve));

      expect(mockLogger.log).toHaveBeenCalled();
    });

    it('should handle mixed type arrays in details', async () => {
      const dto: CreateAuditLogDto = {
        actorId: 'user-123',
        actorType: AuditActorType.USER,
        action: AuditAction.VOTER_BULK_IMPORTED,
        status: AuditStatus.SUCCESS,
        details: {
          data: [1, 'two', true, null, { key: 'value' }],
        },
      };

      await service.log(dto);
      await new Promise((resolve) => setImmediate(resolve));

      expect(mockLogger.log).toHaveBeenCalled();
    });

    it('should handle symbol values gracefully', async () => {
      const dto: CreateAuditLogDto = {
        actorId: 'user-123',
        actorType: AuditActorType.USER,
        action: AuditAction.LOGIN_SUCCESS,
        status: AuditStatus.SUCCESS,
        details: {
          id: Symbol('id'),
          name: 'test',
        } as any,
      };

      await service.log(dto);
      await new Promise((resolve) => setImmediate(resolve));

      expect(mockLogger.log).toHaveBeenCalled();
    });

    it('should handle Buffer objects in details', async () => {
      const dto: CreateAuditLogDto = {
        actorId: 'user-123',
        actorType: AuditActorType.USER,
        action: AuditAction.LOGIN_SUCCESS,
        status: AuditStatus.SUCCESS,
        details: {
          data: Buffer.from('test'),
          name: 'test',
        } as any,
      };

      await service.log(dto);
      await new Promise((resolve) => setImmediate(resolve));

      expect(mockLogger.log).toHaveBeenCalled();
    });

    it('should handle RegExp objects in details', async () => {
      const dto: CreateAuditLogDto = {
        actorId: 'user-123',
        actorType: AuditActorType.USER,
        action: AuditAction.LOGIN_SUCCESS,
        status: AuditStatus.SUCCESS,
        details: {
          pattern: /test/gi,
          name: 'test',
        } as any,
      };

      await service.log(dto);
      await new Promise((resolve) => setImmediate(resolve));

      expect(mockLogger.log).toHaveBeenCalled();
    });

    it('should handle class instances in details', async () => {
      class TestClass {
        constructor(public value: string) {}
      }

      const dto: CreateAuditLogDto = {
        actorId: 'user-123',
        actorType: AuditActorType.USER,
        action: AuditAction.LOGIN_SUCCESS,
        status: AuditStatus.SUCCESS,
        details: {
          instance: new TestClass('test'),
        } as any,
      };

      await service.log(dto);
      await new Promise((resolve) => setImmediate(resolve));

      expect(mockLogger.log).toHaveBeenCalled();
    });
  });
});
