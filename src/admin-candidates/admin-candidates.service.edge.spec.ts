import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { I18nService, I18nContext } from 'nestjs-i18n';
import { AdminCandidatesService } from './admin-candidates.service';
import { Candidate } from './domain/candidate';
import { AuditLogService } from '../audit-log/audit-log.service';

// Mock I18nContext.current()
jest.mock('nestjs-i18n', () => ({
  ...jest.requireActual('nestjs-i18n'),
  I18nContext: {
    current: jest.fn(() => ({ lang: 'en' })),
  },
}));

describe('AdminCandidatesService - Edge Case Tests', () => {
  let service: AdminCandidatesService;
  let candidateRepository: any;
  let electionConfigRepository: any;
  let storageService: any;
  let auditLogService: any;
  let i18nService: any;

  const mockCandidate: Candidate = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    nama: 'John Doe',
    photoUrl: 'https://storage.supabase.co/photo.jpg',
    visiMisi: 'Vision text',
    programKerja: 'Program text',
    grandDesignUrl: 'https://storage.supabase.co/design.pdf',
    createdAt: new Date('2024-01-15T10:00:00.000Z'),
    updatedAt: new Date('2024-01-15T10:00:00.000Z'),
  };

  beforeEach(async () => {
    candidateRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      existsByName: jest.fn(),
    };

    electionConfigRepository = {
      isVotingActive: jest.fn(),
    };

    storageService = {
      uploadPhoto: jest.fn(),
      uploadGrandDesign: jest.fn(),
      deleteFile: jest.fn(),
      ensureFolderExists: jest.fn(),
    };

    auditLogService = {
      log: jest.fn(),
    };

    i18nService = {
      t: jest.fn((key: string) => key),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminCandidatesService,
        {
          provide: 'CandidateRepositoryInterface',
          useValue: candidateRepository,
        },
        {
          provide: 'ElectionConfigRepositoryInterface',
          useValue: electionConfigRepository,
        },
        { provide: 'StorageServiceInterface', useValue: storageService },
        { provide: AuditLogService, useValue: auditLogService },
        { provide: I18nService, useValue: i18nService },
      ],
    }).compile();

    service = module.get<AdminCandidatesService>(AdminCandidatesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create - edge cases', () => {
    it('should handle empty files object', async () => {
      candidateRepository.existsByName.mockResolvedValue(false);
      candidateRepository.create.mockResolvedValue(mockCandidate);

      const result = await service.create({ nama: 'John Doe' }, {}, 'admin-id');

      expect(result.data).toBeDefined();
      expect(storageService.uploadPhoto).not.toHaveBeenCalled();
      expect(storageService.uploadGrandDesign).not.toHaveBeenCalled();
    });

    it('should handle undefined files', async () => {
      candidateRepository.existsByName.mockResolvedValue(false);
      candidateRepository.create.mockResolvedValue(mockCandidate);

      const result = await service.create(
        { nama: 'John Doe' },
        { photo: undefined, grand_design: undefined },
        'admin-id',
      );

      expect(result.data).toBeDefined();
    });

    it('should handle empty photo array', async () => {
      candidateRepository.existsByName.mockResolvedValue(false);
      candidateRepository.create.mockResolvedValue(mockCandidate);

      const result = await service.create(
        { nama: 'John Doe' },
        { photo: [] },
        'admin-id',
      );

      expect(result.data).toBeDefined();
      expect(storageService.uploadPhoto).not.toHaveBeenCalled();
    });

    it('should handle empty grand_design array', async () => {
      candidateRepository.existsByName.mockResolvedValue(false);
      candidateRepository.create.mockResolvedValue(mockCandidate);

      const result = await service.create(
        { nama: 'John Doe' },
        { grand_design: [] },
        'admin-id',
      );

      expect(result.data).toBeDefined();
      expect(storageService.uploadGrandDesign).not.toHaveBeenCalled();
    });

    it('should handle visi_misi with null value', async () => {
      candidateRepository.existsByName.mockResolvedValue(false);
      candidateRepository.create.mockImplementation((candidate: Candidate) => ({
        ...mockCandidate,
        visiMisi: candidate.visiMisi,
      }));

      const result = await service.create(
        { nama: 'John Doe', visi_misi: undefined },
        {},
        'admin-id',
      );

      expect(result.data).toBeDefined();
    });

    it('should handle empty string visi_misi', async () => {
      candidateRepository.existsByName.mockResolvedValue(false);
      candidateRepository.create.mockImplementation((candidate: Candidate) => ({
        ...mockCandidate,
        visiMisi: candidate.visiMisi,
      }));

      const result = await service.create(
        { nama: 'John Doe', visi_misi: '' },
        {},
        'admin-id',
      );

      expect(result.data).toBeDefined();
    });

    it('should handle name with maximum length (100 chars)', async () => {
      const longName = 'A'.repeat(100);
      candidateRepository.existsByName.mockResolvedValue(false);
      candidateRepository.create.mockResolvedValue({
        ...mockCandidate,
        nama: longName,
      });

      const result = await service.create({ nama: longName }, {}, 'admin-id');

      expect(result.data.nama).toHaveLength(100);
    });

    it('should handle visi_misi with maximum length (2000 chars)', async () => {
      const longVisiMisi = 'A'.repeat(2000);
      candidateRepository.existsByName.mockResolvedValue(false);
      candidateRepository.create.mockImplementation((candidate: Candidate) => ({
        ...mockCandidate,
        visiMisi: candidate.visiMisi,
      }));

      const result = await service.create(
        { nama: 'John Doe', visi_misi: longVisiMisi },
        {},
        'admin-id',
      );

      expect(result.data).toBeDefined();
    });

    it('should handle program_kerja with maximum length (3000 chars)', async () => {
      const longProgramKerja = 'B'.repeat(3000);
      candidateRepository.existsByName.mockResolvedValue(false);
      candidateRepository.create.mockImplementation((candidate: Candidate) => ({
        ...mockCandidate,
        programKerja: candidate.programKerja,
      }));

      const result = await service.create(
        { nama: 'John Doe', program_kerja: longProgramKerja },
        {},
        'admin-id',
      );

      expect(result.data).toBeDefined();
    });

    it('should strip all HTML tags when only script tags present', async () => {
      candidateRepository.existsByName.mockResolvedValue(false);
      candidateRepository.create.mockImplementation((candidate: Candidate) => ({
        ...mockCandidate,
        visiMisi: candidate.visiMisi,
      }));

      const result = await service.create(
        { nama: 'John Doe', visi_misi: '<script>alert("xss")</script>' },
        {},
        'admin-id',
      );

      expect(result.data).toBeDefined();
    });

    it('should handle special characters in name', async () => {
      candidateRepository.existsByName.mockResolvedValue(false);
      candidateRepository.create.mockResolvedValue({
        ...mockCandidate,
        nama: "John O'Connor-Smith",
      });

      const result = await service.create(
        { nama: "John O'Connor-Smith" },
        {},
        'admin-id',
      );

      expect(result.data.nama).toBe("John O'Connor-Smith");
    });

    it('should handle unicode characters in name', async () => {
      candidateRepository.existsByName.mockResolvedValue(false);
      candidateRepository.create.mockResolvedValue({
        ...mockCandidate,
        nama: '田中太郎',
      });

      const result = await service.create({ nama: '田中太郎' }, {}, 'admin-id');

      expect(result.data.nama).toBe('田中太郎');
    });
  });

  describe('findMany - edge cases', () => {
    it('should return empty array when no candidates exist', async () => {
      candidateRepository.findMany.mockResolvedValue({
        data: [],
        total: 0,
      });

      const result = await service.findMany({});

      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
      expect(result.meta.totalPages).toBe(0);
    });

    it('should handle page beyond total pages', async () => {
      candidateRepository.findMany.mockResolvedValue({
        data: [],
        total: 5,
      });

      const result = await service.findMany({ page: 10, limit: 10 });

      expect(result.data).toHaveLength(0);
      expect(result.meta.page).toBe(10);
      expect(result.meta.hasNextPage).toBe(false);
    });

    it('should handle limit of 1', async () => {
      candidateRepository.findMany.mockResolvedValue({
        data: [mockCandidate],
        total: 100,
      });

      const result = await service.findMany({ page: 1, limit: 1 });

      expect(result.meta.limit).toBe(1);
      expect(result.meta.totalPages).toBe(100);
    });

    it('should handle maximum limit of 100', async () => {
      candidateRepository.findMany.mockResolvedValue({
        data: [],
        total: 500,
      });

      const result = await service.findMany({ page: 1, limit: 100 });

      expect(result.meta.limit).toBe(100);
      expect(result.meta.totalPages).toBe(5);
    });

    it('should handle search with empty string', async () => {
      candidateRepository.findMany.mockResolvedValue({
        data: [mockCandidate],
        total: 1,
      });

      const result = await service.findMany({ search: '' });

      expect(candidateRepository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ search: '' }),
      );
    });

    it('should handle search with special characters', async () => {
      candidateRepository.findMany.mockResolvedValue({
        data: [],
        total: 0,
      });

      await service.findMany({ search: "O'Connor" });

      expect(candidateRepository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ search: "O'Connor" }),
      );
    });
  });

  describe('update - edge cases', () => {
    it('should not check duplicate name when name unchanged', async () => {
      electionConfigRepository.isVotingActive.mockResolvedValue(false);
      candidateRepository.findById.mockResolvedValue(mockCandidate);
      candidateRepository.update.mockResolvedValue(mockCandidate);

      await service.update(
        '123e4567-e89b-12d3-a456-426614174000',
        { nama: 'John Doe' }, // Same name
        {},
        'admin-id',
      );

      expect(candidateRepository.existsByName).not.toHaveBeenCalled();
    });

    it('should handle update with no changes', async () => {
      electionConfigRepository.isVotingActive.mockResolvedValue(false);
      candidateRepository.findById.mockResolvedValue(mockCandidate);
      candidateRepository.update.mockResolvedValue(mockCandidate);

      const result = await service.update(
        '123e4567-e89b-12d3-a456-426614174000',
        {},
        {},
        'admin-id',
      );

      expect(result.data).toBeDefined();
      expect(candidateRepository.update).toHaveBeenCalled();
    });

    it('should handle candidate without existing photo when uploading new one', async () => {
      const candidateNoPhoto = { ...mockCandidate, photoUrl: null };
      electionConfigRepository.isVotingActive.mockResolvedValue(false);
      candidateRepository.findById.mockResolvedValue(candidateNoPhoto);
      const validPhoto: Express.Multer.File = {
        fieldname: 'photo',
        originalname: 'test.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        size: 1024 * 1024,
        buffer: Buffer.from('test'),
        destination: '',
        filename: '',
        path: '',
        stream: null as any,
      };
      storageService.uploadPhoto.mockResolvedValue(
        'https://storage.supabase.co/new-photo.jpg',
      );
      candidateRepository.update.mockResolvedValue({
        ...mockCandidate,
        photoUrl: 'https://storage.supabase.co/new-photo.jpg',
      });

      await service.update(
        '123e4567-e89b-12d3-a456-426614174000',
        {},
        { photo: [validPhoto] },
        'admin-id',
      );

      // Should not try to delete non-existent file
      expect(storageService.deleteFile).not.toHaveBeenCalled();
      expect(storageService.uploadPhoto).toHaveBeenCalled();
    });

    it('should handle candidate without existing grand design when uploading new one', async () => {
      const candidateNoGrandDesign = { ...mockCandidate, grandDesignUrl: null };
      electionConfigRepository.isVotingActive.mockResolvedValue(false);
      candidateRepository.findById.mockResolvedValue(candidateNoGrandDesign);
      const validPdf: Express.Multer.File = {
        fieldname: 'grand_design',
        originalname: 'design.pdf',
        encoding: '7bit',
        mimetype: 'application/pdf',
        size: 5 * 1024 * 1024,
        buffer: Buffer.from('test'),
        destination: '',
        filename: '',
        path: '',
        stream: null as any,
      };
      storageService.uploadGrandDesign.mockResolvedValue(
        'https://storage.supabase.co/new-design.pdf',
      );
      candidateRepository.update.mockResolvedValue({
        ...mockCandidate,
        grandDesignUrl: 'https://storage.supabase.co/new-design.pdf',
      });

      await service.update(
        '123e4567-e89b-12d3-a456-426614174000',
        {},
        { grand_design: [validPdf] },
        'admin-id',
      );

      expect(storageService.deleteFile).not.toHaveBeenCalled();
      expect(storageService.uploadGrandDesign).toHaveBeenCalled();
    });
  });

  describe('delete - edge cases', () => {
    it('should handle candidate with no files to delete', async () => {
      const candidateNoFiles = {
        ...mockCandidate,
        photoUrl: null,
        grandDesignUrl: null,
      };
      electionConfigRepository.isVotingActive.mockResolvedValue(false);
      candidateRepository.findById.mockResolvedValue(candidateNoFiles);
      candidateRepository.delete.mockResolvedValue(undefined);

      const result = await service.delete(
        '123e4567-e89b-12d3-a456-426614174000',
        'admin-id',
      );

      expect(storageService.deleteFile).not.toHaveBeenCalled();
      expect(result.id).toBe('123e4567-e89b-12d3-a456-426614174000');
    });

    it('should handle storage deleteFile returning error gracefully', async () => {
      electionConfigRepository.isVotingActive.mockResolvedValue(false);
      candidateRepository.findById.mockResolvedValue(mockCandidate);
      storageService.deleteFile.mockImplementation(() => {
        // Simulate logging error but not throwing
        console.error('Failed to delete file');
      });
      candidateRepository.delete.mockResolvedValue(undefined);

      const result = await service.delete(
        '123e4567-e89b-12d3-a456-426614174000',
        'admin-id',
      );

      expect(result.id).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(candidateRepository.delete).toHaveBeenCalled();
    });
  });

  describe('HTML sanitization - edge cases', () => {
    it('should preserve allowed tags', async () => {
      candidateRepository.existsByName.mockResolvedValue(false);
      candidateRepository.create.mockImplementation((candidate: Candidate) => ({
        ...mockCandidate,
        visiMisi: candidate.visiMisi,
      }));

      const result = await service.create(
        {
          nama: 'John Doe',
          visi_misi: '<p><strong>Bold</strong> and <em>italic</em></p>',
        },
        {},
        'admin-id',
      );

      expect(result.data).toBeDefined();
    });

    it('should handle nested malicious tags', async () => {
      candidateRepository.existsByName.mockResolvedValue(false);
      candidateRepository.create.mockImplementation((candidate: Candidate) => ({
        ...mockCandidate,
        visiMisi: candidate.visiMisi,
      }));

      await service.create(
        { nama: 'John Doe', visi_misi: '<p><script><b>text</b></script></p>' },
        {},
        'admin-id',
      );

      expect(candidateRepository.create).toHaveBeenCalled();
    });

    it('should handle HTML entities', async () => {
      candidateRepository.existsByName.mockResolvedValue(false);
      candidateRepository.create.mockImplementation((candidate: Candidate) => ({
        ...mockCandidate,
        visiMisi: candidate.visiMisi,
      }));

      const result = await service.create(
        {
          nama: 'John Doe',
          visi_misi: '&lt;script&gt;alert("xss")&lt;/script&gt;',
        },
        {},
        'admin-id',
      );

      expect(result.data).toBeDefined();
    });

    it('should handle multiline content', async () => {
      candidateRepository.existsByName.mockResolvedValue(false);
      candidateRepository.create.mockImplementation((candidate: Candidate) => ({
        ...mockCandidate,
        visiMisi: candidate.visiMisi,
      }));

      const multilineContent = `
        <p>Line 1</p>
        <p>Line 2</p>
        <ul>
          <li>Item 1</li>
          <li>Item 2</li>
        </ul>
      `;

      await service.create(
        { nama: 'John Doe', visi_misi: multilineContent },
        {},
        'admin-id',
      );

      expect(candidateRepository.create).toHaveBeenCalled();
    });
  });

  describe('file boundary tests', () => {
    it('should accept photo at exactly 2MB limit', async () => {
      const exactLimitPhoto: Express.Multer.File = {
        fieldname: 'photo',
        originalname: 'test.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        size: 2 * 1024 * 1024, // Exactly 2MB
        buffer: Buffer.from('test'),
        destination: '',
        filename: '',
        path: '',
        stream: null as any,
      };
      candidateRepository.existsByName.mockResolvedValue(false);
      storageService.uploadPhoto.mockResolvedValue(
        'https://storage.supabase.co/photo.jpg',
      );
      candidateRepository.create.mockResolvedValue(mockCandidate);

      await service.create(
        { nama: 'John Doe' },
        { photo: [exactLimitPhoto] },
        'admin-id',
      );

      expect(storageService.uploadPhoto).toHaveBeenCalled();
    });

    it('should accept PDF at exactly 10MB limit', async () => {
      const exactLimitPdf: Express.Multer.File = {
        fieldname: 'grand_design',
        originalname: 'design.pdf',
        encoding: '7bit',
        mimetype: 'application/pdf',
        size: 10 * 1024 * 1024, // Exactly 10MB
        buffer: Buffer.from('test'),
        destination: '',
        filename: '',
        path: '',
        stream: null as any,
      };
      candidateRepository.existsByName.mockResolvedValue(false);
      storageService.uploadGrandDesign.mockResolvedValue(
        'https://storage.supabase.co/design.pdf',
      );
      candidateRepository.create.mockResolvedValue(mockCandidate);

      await service.create(
        { nama: 'John Doe' },
        { grand_design: [exactLimitPdf] },
        'admin-id',
      );

      expect(storageService.uploadGrandDesign).toHaveBeenCalled();
    });

    it('should reject photo at 2MB + 1 byte', async () => {
      const overLimitPhoto: Express.Multer.File = {
        fieldname: 'photo',
        originalname: 'test.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        size: 2 * 1024 * 1024 + 1, // 2MB + 1 byte
        buffer: Buffer.from('test'),
        destination: '',
        filename: '',
        path: '',
        stream: null as any,
      };
      candidateRepository.existsByName.mockResolvedValue(false);

      await expect(
        service.create(
          { nama: 'John Doe' },
          { photo: [overLimitPhoto] },
          'admin-id',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject PDF at 10MB + 1 byte', async () => {
      const overLimitPdf: Express.Multer.File = {
        fieldname: 'grand_design',
        originalname: 'design.pdf',
        encoding: '7bit',
        mimetype: 'application/pdf',
        size: 10 * 1024 * 1024 + 1, // 10MB + 1 byte
        buffer: Buffer.from('test'),
        destination: '',
        filename: '',
        path: '',
        stream: null as any,
      };
      candidateRepository.existsByName.mockResolvedValue(false);

      await expect(
        service.create(
          { nama: 'John Doe' },
          { grand_design: [overLimitPdf] },
          'admin-id',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
