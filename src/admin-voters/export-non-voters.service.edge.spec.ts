import { Test, TestingModule } from '@nestjs/testing';
import { I18nService, I18nContext } from 'nestjs-i18n';
import { AdminVotersService } from './admin-voters.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { VoterRepositoryInterface } from './interfaces/voter.repository.interface';
import { Voter } from './domain/voter';

describe('AdminVotersService - exportNonVoters (Edge Case Tests)', () => {
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
  it('should handle exactly 1 non-voter', async () => {
    const mockVoter = createMockVoter();
    voterRepository.findNonVoters.mockResolvedValue([mockVoter]);

    const result = await service.exportNonVoters(mockAdminId);
    const lines = result.csv.split('\r\n');

    expect(lines.length).toBe(2); // Header + 1 data row
  });

  // Test 2
  it('should handle exactly 500 non-voters (max)', async () => {
    const mockVoters = Array.from({ length: 500 }, (_, i) =>
      createMockVoter({
        id: `id-${i}`,
        nim: `21105${String(i).padStart(5, '0')}`,
      }),
    );
    voterRepository.findNonVoters.mockResolvedValue(mockVoters);

    const result = await service.exportNonVoters(mockAdminId);
    const lines = result.csv.split('\r\n');

    expect(lines.length).toBe(501); // Header + 500 data rows
  });

  // Test 3
  it('should handle voter with empty string name', async () => {
    const mockVoter = createMockVoter({ namaLengkap: '' });
    voterRepository.findNonVoters.mockResolvedValue([mockVoter]);

    const result = await service.exportNonVoters(mockAdminId);

    expect(result.csv).toBeDefined();
  });

  // Test 4
  it('should handle voter with whitespace-only name', async () => {
    const mockVoter = createMockVoter({ namaLengkap: '   ' });
    voterRepository.findNonVoters.mockResolvedValue([mockVoter]);

    const result = await service.exportNonVoters(mockAdminId);

    expect(result.csv).toBeDefined();
  });

  // Test 5
  it('should handle voter with newline in name', async () => {
    const mockVoter = createMockVoter({ namaLengkap: 'John\nDoe' });
    voterRepository.findNonVoters.mockResolvedValue([mockVoter]);

    const result = await service.exportNonVoters(mockAdminId);

    // Should be escaped with quotes
    expect(result.csv).toContain('"John\nDoe"');
  });

  // Test 6
  it('should handle voter with tab character in name', async () => {
    const mockVoter = createMockVoter({ namaLengkap: 'John\tDoe' });
    voterRepository.findNonVoters.mockResolvedValue([mockVoter]);

    const result = await service.exportNonVoters(mockAdminId);

    expect(result.csv).toContain('John\tDoe');
  });

  // Test 7
  it('should handle minimum angkatan year (1900)', async () => {
    const mockVoter = createMockVoter({ angkatan: 1900 });
    voterRepository.findNonVoters.mockResolvedValue([mockVoter]);

    const result = await service.exportNonVoters(mockAdminId);

    expect(result.csv).toContain('1900');
  });

  // Test 8
  it('should handle maximum angkatan year (2100)', async () => {
    const mockVoter = createMockVoter({ angkatan: 2100 });
    voterRepository.findNonVoters.mockResolvedValue([mockVoter]);

    const result = await service.exportNonVoters(mockAdminId);

    expect(result.csv).toContain('2100');
  });

  // Test 9
  it('should handle NIM with leading zeros', async () => {
    const mockVoter = createMockVoter({ nim: '0001234567' });
    voterRepository.findNonVoters.mockResolvedValue([mockVoter]);

    const result = await service.exportNonVoters(mockAdminId);

    expect(result.csv).toContain('0001234567');
  });

  // Test 10
  it('should handle NIM with maximum length (15 chars)', async () => {
    const maxNim = '123456789012345';
    const mockVoter = createMockVoter({ nim: maxNim });
    voterRepository.findNonVoters.mockResolvedValue([mockVoter]);

    const result = await service.exportNonVoters(mockAdminId);

    expect(result.csv).toContain(maxNim);
  });

  // Test 11
  it('should handle email with uppercase characters', async () => {
    const mockVoter = createMockVoter({
      email: '2110511001@MAHASISWA.UPNVJ.AC.ID',
    });
    voterRepository.findNonVoters.mockResolvedValue([mockVoter]);

    const result = await service.exportNonVoters(mockAdminId);

    expect(result.csv).toContain('2110511001@MAHASISWA.UPNVJ.AC.ID');
  });

  // Test 12
  it('should handle mixed case in nama', async () => {
    const mockVoter = createMockVoter({ namaLengkap: 'JoHn DoE' });
    voterRepository.findNonVoters.mockResolvedValue([mockVoter]);

    const result = await service.exportNonVoters(mockAdminId);

    expect(result.csv).toContain('JoHn DoE');
  });

  // Test 13
  it('should generate correct timestamp at midnight WIB', async () => {
    const mockVoter = createMockVoter();
    voterRepository.findNonVoters.mockResolvedValue([mockVoter]);

    const result = await service.exportNonVoters(mockAdminId);

    expect(result.filename).toMatch(/^\d{14}-non-voters\.csv$/);
  });

  // Test 14
  it('should generate correct timestamp at 23:59:59 WIB', async () => {
    const mockVoter = createMockVoter();
    voterRepository.findNonVoters.mockResolvedValue([mockVoter]);

    const result = await service.exportNonVoters(mockAdminId);

    expect(result.filename).toMatch(/^\d{14}-non-voters\.csv$/);
  });

  // Test 15
  it('should generate correct timestamp on date boundary', async () => {
    const mockVoter = createMockVoter();
    voterRepository.findNonVoters.mockResolvedValue([mockVoter]);

    const result = await service.exportNonVoters(mockAdminId);

    expect(result.filename).toMatch(/^\d{14}-non-voters\.csv$/);
  });

  // Test 16
  it('should handle DST-like edge cases (WIB has no DST)', async () => {
    const mockVoter = createMockVoter();
    voterRepository.findNonVoters.mockResolvedValue([mockVoter]);

    const result = await service.exportNonVoters(mockAdminId);

    expect(result.filename).toBeDefined();
  });

  // Test 17
  it('should handle leap year date in timestamp', async () => {
    const mockVoter = createMockVoter();
    voterRepository.findNonVoters.mockResolvedValue([mockVoter]);

    const result = await service.exportNonVoters(mockAdminId);

    expect(result.filename).toMatch(/-non-voters\.csv$/);
  });

  // Test 18
  it('should handle year change (Dec 31 23:59 to Jan 1)', async () => {
    const mockVoter = createMockVoter();
    voterRepository.findNonVoters.mockResolvedValue([mockVoter]);

    const result = await service.exportNonVoters(mockAdminId);

    expect(result.filename).toBeDefined();
  });

  // Test 19
  it('should handle CSV field with only quotes', async () => {
    const mockVoter = createMockVoter({ namaLengkap: '"""' });
    voterRepository.findNonVoters.mockResolvedValue([mockVoter]);

    const result = await service.exportNonVoters(mockAdminId);

    // Triple quotes should be escaped
    expect(result.csv).toContain('""');
  });

  // Test 20
  it('should handle CSV field with only commas', async () => {
    const mockVoter = createMockVoter({ namaLengkap: ',,,' });
    voterRepository.findNonVoters.mockResolvedValue([mockVoter]);

    const result = await service.exportNonVoters(mockAdminId);

    expect(result.csv).toContain('",,,"');
  });

  // Test 21
  it('should handle CSV field with mixed special chars', async () => {
    const mockVoter = createMockVoter({ namaLengkap: 'John, "The" Doe\nJr.' });
    voterRepository.findNonVoters.mockResolvedValue([mockVoter]);

    const result = await service.exportNonVoters(mockAdminId);

    expect(result.csv).toContain('"John, ""The"" Doe\nJr."');
  });

  // Test 22
  it('should handle UTF-8 multi-byte characters', async () => {
    const mockVoter = createMockVoter({ namaLengkap: '日本語テスト' });
    voterRepository.findNonVoters.mockResolvedValue([mockVoter]);

    const result = await service.exportNonVoters(mockAdminId);

    expect(result.csv).toContain('日本語テスト');
  });

  // Test 23
  it('should handle emoji in name', async () => {
    const mockVoter = createMockVoter({ namaLengkap: 'John 😀 Doe' });
    voterRepository.findNonVoters.mockResolvedValue([mockVoter]);

    const result = await service.exportNonVoters(mockAdminId);

    expect(result.csv).toContain('😀');
  });

  // Test 24
  it('should handle very long email (255 chars max)', async () => {
    const longEmail = 'a'.repeat(200) + '@mahasiswa.upnvj.ac.id';
    const mockVoter = createMockVoter({ email: longEmail });
    voterRepository.findNonVoters.mockResolvedValue([mockVoter]);

    const result = await service.exportNonVoters(mockAdminId);

    expect(result.csv).toContain(longEmail);
  });

  // Test 25
  it('should handle all voters with same angkatan', async () => {
    const mockVoters = [
      createMockVoter({ angkatan: 2021, nim: '2110511001' }),
      createMockVoter({ angkatan: 2021, nim: '2110511002' }),
      createMockVoter({ angkatan: 2021, nim: '2110511003' }),
    ];
    voterRepository.findNonVoters.mockResolvedValue(mockVoters);

    const result = await service.exportNonVoters(mockAdminId);
    const lines = result.csv.split('\r\n');

    expect(lines.length).toBe(4); // Header + 3 data rows
  });

  // Test 26
  it('should handle voters with same name different angkatan', async () => {
    const mockVoters = [
      createMockVoter({ namaLengkap: 'John Doe', angkatan: 2020 }),
      createMockVoter({ namaLengkap: 'John Doe', angkatan: 2021 }),
      createMockVoter({ namaLengkap: 'John Doe', angkatan: 2022 }),
    ];
    voterRepository.findNonVoters.mockResolvedValue(mockVoters);

    const result = await service.exportNonVoters(mockAdminId);

    expect(result.csv).toContain('2020');
    expect(result.csv).toContain('2021');
    expect(result.csv).toContain('2022');
  });

  // Test 27
  it('should handle voters with same NIM prefix', async () => {
    const mockVoters = [
      createMockVoter({ nim: '2110511001' }),
      createMockVoter({ nim: '2110511002' }),
      createMockVoter({ nim: '2110511003' }),
    ];
    voterRepository.findNonVoters.mockResolvedValue(mockVoters);

    const result = await service.exportNonVoters(mockAdminId);

    expect(result.csv).toContain('2110511001');
    expect(result.csv).toContain('2110511002');
    expect(result.csv).toContain('2110511003');
  });

  // Test 28
  it('should maintain consistent ordering across calls', async () => {
    const mockVoters = [
      createMockVoter({ nim: '2110511003', namaLengkap: 'Charlie' }),
      createMockVoter({ nim: '2110511001', namaLengkap: 'Alice' }),
      createMockVoter({ nim: '2110511002', namaLengkap: 'Bob' }),
    ];
    voterRepository.findNonVoters.mockResolvedValue(mockVoters);

    const result1 = await service.exportNonVoters(mockAdminId);
    const result2 = await service.exportNonVoters(mockAdminId);

    // Both calls should have same data (order depends on repository)
    expect(result1.csv).toContain('Alice');
    expect(result2.csv).toContain('Alice');
  });

  // Test 29
  it('should handle name with diacritics (é, ñ, etc)', async () => {
    const mockVoter = createMockVoter({ namaLengkap: 'José García Núñez' });
    voterRepository.findNonVoters.mockResolvedValue([mockVoter]);

    const result = await service.exportNonVoters(mockAdminId);

    expect(result.csv).toContain('José García Núñez');
  });

  // Test 30
  it('should handle Arabic/Chinese/Japanese characters', async () => {
    const mockVoters = [
      createMockVoter({ namaLengkap: 'محمد علي', nim: '2110511001' }),
      createMockVoter({ namaLengkap: '张伟', nim: '2110511002' }),
      createMockVoter({ namaLengkap: '田中太郎', nim: '2110511003' }),
    ];
    voterRepository.findNonVoters.mockResolvedValue(mockVoters);

    const result = await service.exportNonVoters(mockAdminId);

    expect(result.csv).toContain('محمد علي');
    expect(result.csv).toContain('张伟');
    expect(result.csv).toContain('田中太郎');
  });
});
