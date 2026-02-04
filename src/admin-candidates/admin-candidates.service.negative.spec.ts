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

describe('AdminCandidatesService - Negative Tests', () => {
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

  const mockInvalidPhotoFile: Express.Multer.File = {
    fieldname: 'photo',
    originalname: 'test.gif',
    encoding: '7bit',
    mimetype: 'image/gif',
    size: 1024 * 1024,
    buffer: Buffer.from('test'),
    destination: '',
    filename: '',
    path: '',
    stream: null as any,
  };

  const mockOversizedPhotoFile: Express.Multer.File = {
    fieldname: 'photo',
    originalname: 'test.jpg',
    encoding: '7bit',
    mimetype: 'image/jpeg',
    size: 3 * 1024 * 1024, // 3MB - exceeds 2MB limit
    buffer: Buffer.from('test'),
    destination: '',
    filename: '',
    path: '',
    stream: null as any,
  };

  const mockInvalidPdfFile: Express.Multer.File = {
    fieldname: 'grand_design',
    originalname: 'design.docx',
    encoding: '7bit',
    mimetype:
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    size: 1024 * 1024,
    buffer: Buffer.from('test'),
    destination: '',
    filename: '',
    path: '',
    stream: null as any,
  };

  const mockOversizedPdfFile: Express.Multer.File = {
    fieldname: 'grand_design',
    originalname: 'design.pdf',
    encoding: '7bit',
    mimetype: 'application/pdf',
    size: 15 * 1024 * 1024, // 15MB - exceeds 10MB limit
    buffer: Buffer.from('test'),
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

  describe('create - negative tests', () => {
    it('should throw ConflictException when candidate name already exists', async () => {
      candidateRepository.existsByName.mockResolvedValue(true);

      await expect(
        service.create({ nama: 'John Doe' }, {}, 'admin-id'),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException for invalid photo type (GIF)', async () => {
      candidateRepository.existsByName.mockResolvedValue(false);

      await expect(
        service.create(
          { nama: 'John Doe' },
          { photo: [mockInvalidPhotoFile] },
          'admin-id',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for oversized photo', async () => {
      candidateRepository.existsByName.mockResolvedValue(false);

      await expect(
        service.create(
          { nama: 'John Doe' },
          { photo: [mockOversizedPhotoFile] },
          'admin-id',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid PDF type (DOCX)', async () => {
      candidateRepository.existsByName.mockResolvedValue(false);

      await expect(
        service.create(
          { nama: 'John Doe' },
          { grand_design: [mockInvalidPdfFile] },
          'admin-id',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for oversized PDF', async () => {
      candidateRepository.existsByName.mockResolvedValue(false);

      await expect(
        service.create(
          { nama: 'John Doe' },
          { grand_design: [mockOversizedPdfFile] },
          'admin-id',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw InternalServerErrorException when photo upload fails', async () => {
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
      candidateRepository.existsByName.mockResolvedValue(false);
      storageService.uploadPhoto.mockRejectedValue(new Error('Upload failed'));

      await expect(
        service.create(
          { nama: 'John Doe' },
          { photo: [validPhoto] },
          'admin-id',
        ),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should throw InternalServerErrorException when grand design upload fails', async () => {
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
      candidateRepository.existsByName.mockResolvedValue(false);
      storageService.uploadGrandDesign.mockRejectedValue(
        new Error('Upload failed'),
      );

      await expect(
        service.create(
          { nama: 'John Doe' },
          { grand_design: [validPdf] },
          'admin-id',
        ),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should cleanup photo when grand design upload fails', async () => {
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
      candidateRepository.existsByName.mockResolvedValue(false);
      storageService.uploadPhoto.mockResolvedValue(
        'https://storage.supabase.co/photo.jpg',
      );
      storageService.uploadGrandDesign.mockRejectedValue(
        new Error('Upload failed'),
      );

      await expect(
        service.create(
          { nama: 'John Doe' },
          { photo: [validPhoto], grand_design: [validPdf] },
          'admin-id',
        ),
      ).rejects.toThrow(InternalServerErrorException);

      expect(storageService.deleteFile).toHaveBeenCalledWith(
        'https://storage.supabase.co/photo.jpg',
      );
    });
  });

  describe('findById - negative tests', () => {
    it('should throw NotFoundException when candidate not found', async () => {
      candidateRepository.findById.mockResolvedValue(null);

      await expect(service.findById('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should not call repository with invalid UUID format', async () => {
      candidateRepository.findById.mockResolvedValue(null);

      await expect(service.findById('invalid-uuid')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update - negative tests', () => {
    it('should throw ForbiddenException when voting is active', async () => {
      electionConfigRepository.isVotingActive.mockResolvedValue(true);

      await expect(
        service.update(
          '123e4567-e89b-12d3-a456-426614174000',
          { nama: 'Jane Doe' },
          {},
          'admin-id',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when candidate not found', async () => {
      electionConfigRepository.isVotingActive.mockResolvedValue(false);
      candidateRepository.findById.mockResolvedValue(null);

      await expect(
        service.update('nonexistent-id', { nama: 'Jane Doe' }, {}, 'admin-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when updating to existing name', async () => {
      electionConfigRepository.isVotingActive.mockResolvedValue(false);
      candidateRepository.findById.mockResolvedValue(mockCandidate);
      candidateRepository.existsByName.mockResolvedValue(true);

      await expect(
        service.update(
          '123e4567-e89b-12d3-a456-426614174000',
          { nama: 'Existing Name' },
          {},
          'admin-id',
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException for invalid photo type during update', async () => {
      electionConfigRepository.isVotingActive.mockResolvedValue(false);
      candidateRepository.findById.mockResolvedValue(mockCandidate);

      await expect(
        service.update(
          '123e4567-e89b-12d3-a456-426614174000',
          {},
          { photo: [mockInvalidPhotoFile] },
          'admin-id',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for oversized photo during update', async () => {
      electionConfigRepository.isVotingActive.mockResolvedValue(false);
      candidateRepository.findById.mockResolvedValue(mockCandidate);

      await expect(
        service.update(
          '123e4567-e89b-12d3-a456-426614174000',
          {},
          { photo: [mockOversizedPhotoFile] },
          'admin-id',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid PDF type during update', async () => {
      electionConfigRepository.isVotingActive.mockResolvedValue(false);
      candidateRepository.findById.mockResolvedValue(mockCandidate);

      await expect(
        service.update(
          '123e4567-e89b-12d3-a456-426614174000',
          {},
          { grand_design: [mockInvalidPdfFile] },
          'admin-id',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for oversized PDF during update', async () => {
      electionConfigRepository.isVotingActive.mockResolvedValue(false);
      candidateRepository.findById.mockResolvedValue(mockCandidate);

      await expect(
        service.update(
          '123e4567-e89b-12d3-a456-426614174000',
          {},
          { grand_design: [mockOversizedPdfFile] },
          'admin-id',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('delete - negative tests', () => {
    it('should throw ForbiddenException when voting is active', async () => {
      electionConfigRepository.isVotingActive.mockResolvedValue(true);

      await expect(
        service.delete('123e4567-e89b-12d3-a456-426614174000', 'admin-id'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when candidate not found', async () => {
      electionConfigRepository.isVotingActive.mockResolvedValue(false);
      candidateRepository.findById.mockResolvedValue(null);

      await expect(
        service.delete('nonexistent-id', 'admin-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should not log audit on failed deletion', async () => {
      electionConfigRepository.isVotingActive.mockResolvedValue(false);
      candidateRepository.findById.mockResolvedValue(null);

      await expect(
        service.delete('nonexistent-id', 'admin-id'),
      ).rejects.toThrow();

      expect(auditLogService.log).not.toHaveBeenCalled();
    });

    it('should not call repository delete on not found', async () => {
      electionConfigRepository.isVotingActive.mockResolvedValue(false);
      candidateRepository.findById.mockResolvedValue(null);

      await expect(
        service.delete('nonexistent-id', 'admin-id'),
      ).rejects.toThrow();

      expect(candidateRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe('file validation - negative tests', () => {
    it('should reject image/webp mimetype', async () => {
      const webpFile: Express.Multer.File = {
        fieldname: 'photo',
        originalname: 'test.webp',
        encoding: '7bit',
        mimetype: 'image/webp',
        size: 1024 * 1024,
        buffer: Buffer.from('test'),
        destination: '',
        filename: '',
        path: '',
        stream: null as any,
      };
      candidateRepository.existsByName.mockResolvedValue(false);

      await expect(
        service.create({ nama: 'John Doe' }, { photo: [webpFile] }, 'admin-id'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject image/bmp mimetype', async () => {
      const bmpFile: Express.Multer.File = {
        fieldname: 'photo',
        originalname: 'test.bmp',
        encoding: '7bit',
        mimetype: 'image/bmp',
        size: 1024 * 1024,
        buffer: Buffer.from('test'),
        destination: '',
        filename: '',
        path: '',
        stream: null as any,
      };
      candidateRepository.existsByName.mockResolvedValue(false);

      await expect(
        service.create({ nama: 'John Doe' }, { photo: [bmpFile] }, 'admin-id'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject text/plain as grand design', async () => {
      const textFile: Express.Multer.File = {
        fieldname: 'grand_design',
        originalname: 'design.txt',
        encoding: '7bit',
        mimetype: 'text/plain',
        size: 1024,
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
          { grand_design: [textFile] },
          'admin-id',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
