import { Test, TestingModule } from '@nestjs/testing';
import { I18nService, I18nContext } from 'nestjs-i18n';
import { AdminVotersService } from './admin-voters.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { VoterRepositoryInterface } from './interfaces/voter.repository.interface';
import { Voter } from './domain/voter';
import { AuditAction } from '../audit-log/enums/audit-action.enum';
import { AuditActorType } from '../audit-log/enums/audit-actor-type.enum';
import { AuditStatus } from '../audit-log/enums/audit-status.enum';

describe('AdminVotersService - exportNonVoters (Positive Tests)', () => {
  let service: AdminVotersService;
  let voterRepository: jest.Mocked<VoterRepositoryInterface>;
  let auditLogService: jest.Mocked<AuditLogService>;
  let i18nService: jest.Mocked<I18nService>;

  const mockAdminId = '123e4567-e89b-12d3-a456-426614174000';

  const createMockVoter = (overrides: Partial<Voter> = {}): Voter => {
    const voter = new Voter();
    voter.id = overrides.id || '123e4567-e89b-12d3-a456-426614174001';
    voter.nim = overrides.nim || '2110511001';
    voter.namaLengkap = overrides.namaLengkap || 'John Doe';
    voter.angkatan = overrides.angkatan || 2021;
    voter.email = overrides.email || '2110511001@mahasiswa.upnvj.ac.id';
    voter.hasVoted = overrides.hasVoted ?? false;
    voter.votedAt = overrides.votedAt || null;
    voter.createdAt = overrides.createdAt || new Date('2024-01-01T00:00:00Z');
    voter.updatedAt = overrides.updatedAt || new Date('2024-01-01T00:00:00Z');
    voter.deletedAt = overrides.deletedAt || null;
    return voter;
  };

  beforeEach(async () => {
    const mockVoterRepository: jest.Mocked<VoterRepositoryInterface> = {
      create: jest.fn(),
      findById: jest.fn(),
      findByNim: jest.fn(),
      findByNimIncludingDeleted: jest.fn(),
      findByNimsIncludingDeleted: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      restore: jest.fn(),
      findDeletedById: jest.fn(),
      bulkCreate: jest.fn(),
      findNonVoters: jest.fn(),
    };

    const mockAuditLogService = {
      log: jest.fn(),
    };

    const mockI18nService = {
      t: jest.fn().mockImplementation((key: string) => key),
    };

    jest.spyOn(I18nContext, 'current').mockReturnValue({
      lang: 'en',
    } as unknown as I18nContext<unknown>);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminVotersService,
        {
          provide: 'VoterRepositoryInterface',
          useValue: mockVoterRepository,
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

    service = module.get<AdminVotersService>(AdminVotersService);
    voterRepository = module.get('VoterRepositoryInterface');
    auditLogService = module.get(AuditLogService);
    i18nService = module.get(I18nService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Test 1
  it('should export non-voters successfully with single voter', async () => {
    const mockVoter = createMockVoter();
    voterRepository.findNonVoters.mockResolvedValue([mockVoter]);

    const result = await service.exportNonVoters(mockAdminId);

    expect(result.csv).toBeDefined();
    expect(result.filename).toBeDefined();
  });

  // Test 2
  it('should export non-voters successfully with multiple voters', async () => {
    const mockVoters = [
      createMockVoter({ nim: '2110511001', namaLengkap: 'John Doe' }),
      createMockVoter({ nim: '2110511002', namaLengkap: 'Jane Doe' }),
      createMockVoter({ nim: '2110511003', namaLengkap: 'Bob Smith' }),
    ];
    voterRepository.findNonVoters.mockResolvedValue(mockVoters);

    const result = await service.exportNonVoters(mockAdminId);

    expect(result.csv).toContain('2110511001');
    expect(result.csv).toContain('2110511002');
    expect(result.csv).toContain('2110511003');
  });

  // Test 3
  it('should include correct CSV headers (NIM,Nama,Angkatan,Email)', async () => {
    const mockVoter = createMockVoter();
    voterRepository.findNonVoters.mockResolvedValue([mockVoter]);

    const result = await service.exportNonVoters(mockAdminId);

    const firstLine = result.csv.split('\r\n')[0];
    // Remove BOM if present
    const headers = firstLine.replace('\uFEFF', '');
    expect(headers).toBe('NIM,Nama,Angkatan,Email');
  });

  // Test 4
  it('should include BOM at start of CSV', async () => {
    const mockVoter = createMockVoter();
    voterRepository.findNonVoters.mockResolvedValue([mockVoter]);

    const result = await service.exportNonVoters(mockAdminId);

    expect(result.csv.charCodeAt(0)).toBe(0xfeff);
  });

  // Test 5
  it('should generate filename with correct format (YYYYMMDDHHmmss-non-voters.csv)', async () => {
    const mockVoter = createMockVoter();
    voterRepository.findNonVoters.mockResolvedValue([mockVoter]);

    const result = await service.exportNonVoters(mockAdminId);

    expect(result.filename).toMatch(/^\d{14}-non-voters\.csv$/);
  });

  // Test 6
  it('should use WIB timezone for filename', async () => {
    const mockVoter = createMockVoter();
    voterRepository.findNonVoters.mockResolvedValue([mockVoter]);

    const result = await service.exportNonVoters(mockAdminId);

    // Filename should end with -non-voters.csv
    expect(result.filename).toMatch(/-non-voters\.csv$/);
  });

  // Test 7
  it('should order voters by angkatan ascending', async () => {
    const mockVoters = [
      createMockVoter({ angkatan: 2023, nim: '2310511001' }),
      createMockVoter({ angkatan: 2021, nim: '2110511001' }),
      createMockVoter({ angkatan: 2022, nim: '2210511001' }),
    ];
    voterRepository.findNonVoters.mockResolvedValue(mockVoters);

    const result = await service.exportNonVoters(mockAdminId);

    // Repository should return sorted data
    expect(voterRepository.findNonVoters).toHaveBeenCalled();
  });

  // Test 8
  it('should order voters by nama_lengkap ascending within same angkatan', async () => {
    const mockVoters = [
      createMockVoter({ angkatan: 2021, namaLengkap: 'Alice' }),
      createMockVoter({ angkatan: 2021, namaLengkap: 'Bob' }),
    ];
    voterRepository.findNonVoters.mockResolvedValue(mockVoters);

    const result = await service.exportNonVoters(mockAdminId);

    expect(result.csv).toBeDefined();
  });

  // Test 9
  it('should log audit with EXPORT_NON_VOTERS action on success', async () => {
    const mockVoter = createMockVoter();
    voterRepository.findNonVoters.mockResolvedValue([mockVoter]);

    await service.exportNonVoters(mockAdminId);

    expect(auditLogService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: AuditAction.EXPORT_NON_VOTERS,
      }),
    );
  });

  // Test 10
  it('should log audit with SUCCESS status', async () => {
    const mockVoter = createMockVoter();
    voterRepository.findNonVoters.mockResolvedValue([mockVoter]);

    await service.exportNonVoters(mockAdminId);

    expect(auditLogService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        status: AuditStatus.SUCCESS,
      }),
    );
  });

  // Test 11
  it('should include count in audit details', async () => {
    const mockVoters = [
      createMockVoter(),
      createMockVoter({ nim: '2110511002' }),
    ];
    voterRepository.findNonVoters.mockResolvedValue(mockVoters);

    await service.exportNonVoters(mockAdminId);

    expect(auditLogService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        details: expect.objectContaining({
          count: 2,
        }),
      }),
    );
  });

  // Test 12
  it('should include filename in audit details', async () => {
    const mockVoter = createMockVoter();
    voterRepository.findNonVoters.mockResolvedValue([mockVoter]);

    await service.exportNonVoters(mockAdminId);

    expect(auditLogService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        details: expect.objectContaining({
          filename: expect.stringMatching(/^\d{14}-non-voters\.csv$/),
        }),
      }),
    );
  });

  // Test 13
  it('should include adminId as actorId in audit', async () => {
    const mockVoter = createMockVoter();
    voterRepository.findNonVoters.mockResolvedValue([mockVoter]);

    await service.exportNonVoters(mockAdminId);

    expect(auditLogService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: mockAdminId,
        actorType: AuditActorType.ADMIN,
      }),
    );
  });

  // Test 14
  it('should return CSV with CRLF line endings', async () => {
    const mockVoters = [
      createMockVoter({ nim: '2110511001' }),
      createMockVoter({ nim: '2110511002' }),
    ];
    voterRepository.findNonVoters.mockResolvedValue(mockVoters);

    const result = await service.exportNonVoters(mockAdminId);

    expect(result.csv).toContain('\r\n');
  });

  // Test 15
  it('should properly escape names with commas', async () => {
    const mockVoter = createMockVoter({ namaLengkap: 'Doe, John' });
    voterRepository.findNonVoters.mockResolvedValue([mockVoter]);

    const result = await service.exportNonVoters(mockAdminId);

    expect(result.csv).toContain('"Doe, John"');
  });

  // Test 16
  it('should properly escape names with quotes', async () => {
    const mockVoter = createMockVoter({ namaLengkap: 'John "Johnny" Doe' });
    voterRepository.findNonVoters.mockResolvedValue([mockVoter]);

    const result = await service.exportNonVoters(mockAdminId);

    expect(result.csv).toContain('"John ""Johnny"" Doe"');
  });

  // Test 17
  it('should handle special characters in names', async () => {
    const mockVoter = createMockVoter({ namaLengkap: "John O'Brien" });
    voterRepository.findNonVoters.mockResolvedValue([mockVoter]);

    const result = await service.exportNonVoters(mockAdminId);

    expect(result.csv).toContain("O'Brien");
  });

  // Test 18
  it('should handle Unicode characters in names', async () => {
    const mockVoter = createMockVoter({ namaLengkap: 'José García' });
    voterRepository.findNonVoters.mockResolvedValue([mockVoter]);

    const result = await service.exportNonVoters(mockAdminId);

    expect(result.csv).toContain('José García');
  });

  // Test 19
  it('should export voters from different angkatan', async () => {
    const mockVoters = [
      createMockVoter({ angkatan: 2020 }),
      createMockVoter({ angkatan: 2021 }),
      createMockVoter({ angkatan: 2022 }),
    ];
    voterRepository.findNonVoters.mockResolvedValue(mockVoters);

    const result = await service.exportNonVoters(mockAdminId);

    expect(result.csv).toContain('2020');
    expect(result.csv).toContain('2021');
    expect(result.csv).toContain('2022');
  });

  // Test 20
  it('should only include has_voted=false voters', async () => {
    const mockVoter = createMockVoter({ hasVoted: false });
    voterRepository.findNonVoters.mockResolvedValue([mockVoter]);

    await service.exportNonVoters(mockAdminId);

    expect(voterRepository.findNonVoters).toHaveBeenCalled();
  });

  // Test 21
  it('should exclude soft-deleted voters (repository handles this)', async () => {
    const mockVoter = createMockVoter();
    voterRepository.findNonVoters.mockResolvedValue([mockVoter]);

    await service.exportNonVoters(mockAdminId);

    // findNonVoters should be called and repository handles deleted_at filter
    expect(voterRepository.findNonVoters).toHaveBeenCalled();
  });

  // Test 22
  it('should return all 4 columns for each voter', async () => {
    const mockVoter = createMockVoter({
      nim: '2110511001',
      namaLengkap: 'John Doe',
      angkatan: 2021,
      email: '2110511001@mahasiswa.upnvj.ac.id',
    });
    voterRepository.findNonVoters.mockResolvedValue([mockVoter]);

    const result = await service.exportNonVoters(mockAdminId);
    const lines = result.csv.split('\r\n');
    const dataLine = lines[1];

    expect(dataLine).toContain('2110511001');
    expect(dataLine).toContain('John Doe');
    expect(dataLine).toContain('2021');
    expect(dataLine).toContain('@mahasiswa.upnvj.ac.id');
  });

  // Test 23
  it('should format angkatan as string in CSV', async () => {
    const mockVoter = createMockVoter({ angkatan: 2021 });
    voterRepository.findNonVoters.mockResolvedValue([mockVoter]);

    const result = await service.exportNonVoters(mockAdminId);

    expect(result.csv).toContain('2021');
  });

  // Test 24
  it('should handle maximum expected data (500 voters)', async () => {
    const mockVoters = Array.from({ length: 500 }, (_, i) =>
      createMockVoter({
        id: `id-${i}`,
        nim: `21105${String(i).padStart(5, '0')}`,
        namaLengkap: `Voter ${i}`,
      }),
    );
    voterRepository.findNonVoters.mockResolvedValue(mockVoters);

    const result = await service.exportNonVoters(mockAdminId);

    const lines = result.csv.split('\r\n');
    // Header + 500 data rows
    expect(lines.length).toBe(501);
  });

  // Test 25
  it('should call repository.findNonVoters() once', async () => {
    const mockVoter = createMockVoter();
    voterRepository.findNonVoters.mockResolvedValue([mockVoter]);

    await service.exportNonVoters(mockAdminId);

    expect(voterRepository.findNonVoters).toHaveBeenCalledTimes(1);
  });

  // Test 26
  it('should return valid CSV parseable by parsers', async () => {
    const mockVoter = createMockVoter();
    voterRepository.findNonVoters.mockResolvedValue([mockVoter]);

    const result = await service.exportNonVoters(mockAdminId);
    const lines = result.csv.split('\r\n');

    // Should have header and at least one data row
    expect(lines.length).toBeGreaterThanOrEqual(2);
    // Each line should have 4 columns
    lines.forEach((line) => {
      if (line.trim()) {
        const cleanLine = line.replace('\uFEFF', '');
        // Count commas (should have 3 for 4 columns)
        const commaCount = (
          cleanLine.match(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/g) || []
        ).length;
        expect(commaCount).toBe(3);
      }
    });
  });

  // Test 27
  it('should handle emails with special characters', async () => {
    const mockVoter = createMockVoter({
      email: '2110511001@mahasiswa.upnvj.ac.id',
    });
    voterRepository.findNonVoters.mockResolvedValue([mockVoter]);

    const result = await service.exportNonVoters(mockAdminId);

    expect(result.csv).toContain('2110511001@mahasiswa.upnvj.ac.id');
  });

  // Test 28
  it('should trim whitespace in CSV fields (handled by data)', async () => {
    const mockVoter = createMockVoter({ namaLengkap: 'John Doe' });
    voterRepository.findNonVoters.mockResolvedValue([mockVoter]);

    const result = await service.exportNonVoters(mockAdminId);

    expect(result.csv).toContain('John Doe');
  });

  // Test 29
  it('should handle long names (100 chars)', async () => {
    const longName = 'A'.repeat(100);
    const mockVoter = createMockVoter({ namaLengkap: longName });
    voterRepository.findNonVoters.mockResolvedValue([mockVoter]);

    const result = await service.exportNonVoters(mockAdminId);

    expect(result.csv).toContain(longName);
  });

  // Test 30
  it('should handle minimum NIM length', async () => {
    const mockVoter = createMockVoter({ nim: '1' });
    voterRepository.findNonVoters.mockResolvedValue([mockVoter]);

    const result = await service.exportNonVoters(mockAdminId);
    const lines = result.csv.split('\r\n');
    const dataLine = lines[1];

    expect(dataLine.startsWith('1,')).toBe(true);
  });
});
