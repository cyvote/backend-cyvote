import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
  InternalServerErrorException,
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

describe('AdminCandidatesService - Positive Tests', () => {
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

  const mockPhotoFile: Express.Multer.File = {
    fieldname: 'photo',
    originalname: 'test.jpg',
    encoding: '7bit',
    mimetype: 'image/jpeg',
    size: 1024 * 1024, // 1MB
    buffer: Buffer.from('test'),
    destination: '',
    filename: '',
    path: '',
    stream: null as any,
  };

  const mockPdfFile: Express.Multer.File = {
    fieldname: 'grand_design',
    originalname: 'design.pdf',
    encoding: '7bit',
    mimetype: 'application/pdf',
    size: 5 * 1024 * 1024, // 5MB
    buffer: Buffer.from('test pdf'),
    destination: '',
    filename: '',
    path: '',
    stream: null as any,
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

  describe('create', () => {
    it('should create a candidate with name only', async () => {
      const dto = { nama: 'John Doe' };
      candidateRepository.existsByName.mockResolvedValue(false);
      candidateRepository.create.mockResolvedValue(mockCandidate);

      const result = await service.create(dto, {}, 'admin-id');

      expect(result.data.nama).toBe('John Doe');
      expect(candidateRepository.create).toHaveBeenCalled();
      expect(auditLogService.log).toHaveBeenCalled();
    });

    it('should create a candidate with photo upload', async () => {
      const dto = { nama: 'John Doe' };
      candidateRepository.existsByName.mockResolvedValue(false);
      storageService.uploadPhoto.mockResolvedValue(
        'https://storage.supabase.co/photo.jpg',
      );
      candidateRepository.create.mockResolvedValue(mockCandidate);

      const result = await service.create(
        dto,
        { photo: [mockPhotoFile] },
        'admin-id',
      );

      expect(result.data.nama).toBe('John Doe');
      expect(storageService.uploadPhoto).toHaveBeenCalledWith(mockPhotoFile);
    });

    it('should create a candidate with grand design upload', async () => {
      const dto = { nama: 'John Doe' };
      candidateRepository.existsByName.mockResolvedValue(false);
      storageService.uploadGrandDesign.mockResolvedValue(
        'https://storage.supabase.co/design.pdf',
      );
      candidateRepository.create.mockResolvedValue(mockCandidate);

      const result = await service.create(
        dto,
        { grand_design: [mockPdfFile] },
        'admin-id',
      );

      expect(result.data.nama).toBe('John Doe');
      expect(storageService.uploadGrandDesign).toHaveBeenCalledWith(
        mockPdfFile,
      );
    });

    it('should create a candidate with both photo and grand design', async () => {
      const dto = { nama: 'John Doe' };
      candidateRepository.existsByName.mockResolvedValue(false);
      storageService.uploadPhoto.mockResolvedValue(
        'https://storage.supabase.co/photo.jpg',
      );
      storageService.uploadGrandDesign.mockResolvedValue(
        'https://storage.supabase.co/design.pdf',
      );
      candidateRepository.create.mockResolvedValue(mockCandidate);

      const result = await service.create(
        dto,
        { photo: [mockPhotoFile], grand_design: [mockPdfFile] },
        'admin-id',
      );

      expect(result.data.nama).toBe('John Doe');
      expect(storageService.uploadPhoto).toHaveBeenCalled();
      expect(storageService.uploadGrandDesign).toHaveBeenCalled();
    });

    it('should create a candidate with visi_misi and sanitize HTML', async () => {
      const dto = {
        nama: 'John Doe',
        visi_misi: '<p>Vision</p><script>alert("xss")</script>',
      };
      candidateRepository.existsByName.mockResolvedValue(false);
      candidateRepository.create.mockImplementation((candidate: Candidate) => ({
        ...mockCandidate,
        visiMisi: candidate.visiMisi,
      }));

      const result = await service.create(dto, {}, 'admin-id');

      expect(result.data.visi_misi).not.toContain('<script>');
    });

    it('should create a candidate with program_kerja and sanitize HTML', async () => {
      const dto = {
        nama: 'John Doe',
        program_kerja: '<p>Program</p><img src="x" onerror="alert(1)">',
      };
      candidateRepository.existsByName.mockResolvedValue(false);
      candidateRepository.create.mockImplementation((candidate: Candidate) => ({
        ...mockCandidate,
        programKerja: candidate.programKerja,
      }));

      const result = await service.create(dto, {}, 'admin-id');

      expect(result.data.program_kerja).not.toContain('onerror');
    });

    it('should log audit event on successful creation', async () => {
      const dto = { nama: 'John Doe' };
      candidateRepository.existsByName.mockResolvedValue(false);
      candidateRepository.create.mockResolvedValue(mockCandidate);

      await service.create(dto, {}, 'admin-id');

      expect(auditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'admin-id',
          action: 'CANDIDATE_CREATED',
        }),
      );
    });
  });

  describe('findMany', () => {
    it('should return paginated candidates', async () => {
      candidateRepository.findMany.mockResolvedValue({
        data: [mockCandidate],
        total: 1,
      });

      const result = await service.findMany({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
    });

    it('should return correct pagination metadata', async () => {
      candidateRepository.findMany.mockResolvedValue({
        data: [mockCandidate, mockCandidate],
        total: 25,
      });

      const result = await service.findMany({ page: 2, limit: 10 });

      expect(result.meta.page).toBe(2);
      expect(result.meta.limit).toBe(10);
      expect(result.meta.total).toBe(25);
      expect(result.meta.totalPages).toBe(3);
      expect(result.meta.hasNextPage).toBe(true);
      expect(result.meta.hasPreviousPage).toBe(true);
    });

    it('should use default pagination values', async () => {
      candidateRepository.findMany.mockResolvedValue({
        data: [],
        total: 0,
      });

      const result = await service.findMany({});

      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
    });

    it('should search by name', async () => {
      candidateRepository.findMany.mockResolvedValue({
        data: [mockCandidate],
        total: 1,
      });

      await service.findMany({ search: 'John' });

      expect(candidateRepository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'John' }),
      );
    });
  });

  describe('findById', () => {
    it('should return candidate by ID', async () => {
      candidateRepository.findById.mockResolvedValue(mockCandidate);

      const result = await service.findById(
        '123e4567-e89b-12d3-a456-426614174000',
      );

      expect(result.data.id).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(result.data.nama).toBe('John Doe');
    });

    it('should return all candidate fields', async () => {
      candidateRepository.findById.mockResolvedValue(mockCandidate);

      const result = await service.findById(
        '123e4567-e89b-12d3-a456-426614174000',
      );

      expect(result.data).toHaveProperty('id');
      expect(result.data).toHaveProperty('nama');
      expect(result.data).toHaveProperty('photo_url');
      expect(result.data).toHaveProperty('visi_misi');
      expect(result.data).toHaveProperty('program_kerja');
      expect(result.data).toHaveProperty('grand_design_url');
      expect(result.data).toHaveProperty('created_at');
      expect(result.data).toHaveProperty('updated_at');
    });
  });

  describe('update', () => {
    it('should update candidate name', async () => {
      electionConfigRepository.isVotingActive.mockResolvedValue(false);
      candidateRepository.findById.mockResolvedValue(mockCandidate);
      candidateRepository.existsByName.mockResolvedValue(false);
      candidateRepository.update.mockResolvedValue({
        ...mockCandidate,
        nama: 'Jane Doe',
      });

      const result = await service.update(
        '123e4567-e89b-12d3-a456-426614174000',
        { nama: 'Jane Doe' },
        {},
        'admin-id',
      );

      expect(result.data.nama).toBe('Jane Doe');
    });

    it('should update candidate with new photo', async () => {
      electionConfigRepository.isVotingActive.mockResolvedValue(false);
      candidateRepository.findById.mockResolvedValue(mockCandidate);
      storageService.uploadPhoto.mockResolvedValue(
        'https://storage.supabase.co/new-photo.jpg',
      );
      candidateRepository.update.mockResolvedValue({
        ...mockCandidate,
        photoUrl: 'https://storage.supabase.co/new-photo.jpg',
      });

      const result = await service.update(
        '123e4567-e89b-12d3-a456-426614174000',
        {},
        { photo: [mockPhotoFile] },
        'admin-id',
      );

      expect(storageService.deleteFile).toHaveBeenCalledWith(
        mockCandidate.photoUrl,
      );
      expect(storageService.uploadPhoto).toHaveBeenCalled();
    });

    it('should update candidate with new grand design', async () => {
      electionConfigRepository.isVotingActive.mockResolvedValue(false);
      candidateRepository.findById.mockResolvedValue(mockCandidate);
      storageService.uploadGrandDesign.mockResolvedValue(
        'https://storage.supabase.co/new-design.pdf',
      );
      candidateRepository.update.mockResolvedValue({
        ...mockCandidate,
        grandDesignUrl: 'https://storage.supabase.co/new-design.pdf',
      });

      const result = await service.update(
        '123e4567-e89b-12d3-a456-426614174000',
        {},
        { grand_design: [mockPdfFile] },
        'admin-id',
      );

      expect(storageService.deleteFile).toHaveBeenCalledWith(
        mockCandidate.grandDesignUrl,
      );
      expect(storageService.uploadGrandDesign).toHaveBeenCalled();
    });

    it('should log audit event on successful update', async () => {
      electionConfigRepository.isVotingActive.mockResolvedValue(false);
      candidateRepository.findById.mockResolvedValue(mockCandidate);
      candidateRepository.update.mockResolvedValue(mockCandidate);

      await service.update(
        '123e4567-e89b-12d3-a456-426614174000',
        { nama: 'Jane Doe' },
        {},
        'admin-id',
      );

      expect(auditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'admin-id',
          action: 'CANDIDATE_UPDATED',
        }),
      );
    });
  });

  describe('delete', () => {
    it('should delete candidate successfully', async () => {
      electionConfigRepository.isVotingActive.mockResolvedValue(false);
      candidateRepository.findById.mockResolvedValue(mockCandidate);
      candidateRepository.delete.mockResolvedValue(undefined);

      const result = await service.delete(
        '123e4567-e89b-12d3-a456-426614174000',
        'admin-id',
      );

      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('id');
      expect(candidateRepository.delete).toHaveBeenCalled();
    });

    it('should delete files from storage', async () => {
      electionConfigRepository.isVotingActive.mockResolvedValue(false);
      candidateRepository.findById.mockResolvedValue(mockCandidate);
      candidateRepository.delete.mockResolvedValue(undefined);

      await service.delete('123e4567-e89b-12d3-a456-426614174000', 'admin-id');

      expect(storageService.deleteFile).toHaveBeenCalledWith(
        mockCandidate.photoUrl,
      );
      expect(storageService.deleteFile).toHaveBeenCalledWith(
        mockCandidate.grandDesignUrl,
      );
    });

    it('should log audit event on successful deletion', async () => {
      electionConfigRepository.isVotingActive.mockResolvedValue(false);
      candidateRepository.findById.mockResolvedValue(mockCandidate);
      candidateRepository.delete.mockResolvedValue(undefined);

      await service.delete('123e4567-e89b-12d3-a456-426614174000', 'admin-id');

      expect(auditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'admin-id',
          action: 'CANDIDATE_DELETED',
        }),
      );
    });

    it('should delete candidate without photo', async () => {
      const candidateNoPhoto = { ...mockCandidate, photoUrl: null };
      electionConfigRepository.isVotingActive.mockResolvedValue(false);
      candidateRepository.findById.mockResolvedValue(candidateNoPhoto);
      candidateRepository.delete.mockResolvedValue(undefined);

      await service.delete('123e4567-e89b-12d3-a456-426614174000', 'admin-id');

      expect(storageService.deleteFile).toHaveBeenCalledTimes(1);
      expect(candidateRepository.delete).toHaveBeenCalled();
    });

    it('should delete candidate without grand design', async () => {
      const candidateNoGrandDesign = { ...mockCandidate, grandDesignUrl: null };
      electionConfigRepository.isVotingActive.mockResolvedValue(false);
      candidateRepository.findById.mockResolvedValue(candidateNoGrandDesign);
      candidateRepository.delete.mockResolvedValue(undefined);

      await service.delete('123e4567-e89b-12d3-a456-426614174000', 'admin-id');

      expect(storageService.deleteFile).toHaveBeenCalledTimes(1);
      expect(candidateRepository.delete).toHaveBeenCalled();
    });
  });
});
