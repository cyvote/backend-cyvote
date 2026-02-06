import {
  Inject,
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import sanitizeHtml from 'sanitize-html';
import { CandidateRepositoryInterface } from './interfaces/candidate.repository.interface';
import { ElectionConfigRepositoryInterface } from './interfaces/election-config.repository.interface';
import { StorageServiceInterface } from './interfaces/storage.service.interface';
import { Candidate } from './domain/candidate';
import { CandidateStatus } from './enums/candidate-status.enum';
import { CreateCandidateDto } from './dto/create-candidate.dto';
import { UpdateCandidateDto } from './dto/update-candidate.dto';
import { QueryCandidatesDto } from './dto/query-candidates.dto';
import {
  CandidateResponseDto,
  SingleCandidateResponseDto,
} from './dto/candidate-response.dto';
import {
  PaginatedCandidatesResponseDto,
  PaginationMetaDto,
} from './dto/paginated-candidates-response.dto';
import { DeleteCandidateResponseDto } from './dto/delete-candidate-response.dto';
import { CandidateErrorCode } from './errors/candidate.errors';
import { AuditLogService } from '../audit-log/audit-log.service';
import { AuditAction } from '../audit-log/enums/audit-action.enum';
import { AuditActorType } from '../audit-log/enums/audit-actor-type.enum';
import { AuditStatus } from '../audit-log/enums/audit-status.enum';
import { AuditResourceType } from '../audit-log/enums/audit-resource-type.enum';
import { I18nContext, I18nService } from 'nestjs-i18n';

// File size limits
const MAX_PHOTO_SIZE = 2 * 1024 * 1024; // 2MB
const MAX_PDF_SIZE = 10 * 1024 * 1024; // 10MB

// Allowed MIME types
const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/jpg'];
const ALLOWED_PDF_TYPES = ['application/pdf'];

/**
 * Service for candidate management
 */
@Injectable()
export class AdminCandidatesService {
  constructor(
    @Inject('CandidateRepositoryInterface')
    private readonly candidateRepository: CandidateRepositoryInterface,
    @Inject('ElectionConfigRepositoryInterface')
    private readonly electionConfigRepository: ElectionConfigRepositoryInterface,
    @Inject('StorageServiceInterface')
    private readonly storageService: StorageServiceInterface,
    private readonly auditLogService: AuditLogService,
    private readonly i18n: I18nService,
  ) {}

  /**
   * Sanitize HTML content to prevent XSS
   */
  private sanitizeContent(content: string | undefined | null): string | null {
    if (!content) return null;

    return sanitizeHtml(content, {
      allowedTags: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li'],
      allowedAttributes: {},
    });
  }

  /**
   * Validate photo file
   */
  private validatePhotoFile(file: Express.Multer.File): void {
    if (!ALLOWED_PHOTO_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        this.i18n.t('candidates.invalidPhotoType', {
          lang: I18nContext.current()?.lang,
        }),
      );
    }

    if (file.size > MAX_PHOTO_SIZE) {
      throw new BadRequestException(
        this.i18n.t('candidates.photoSizeExceeded', {
          lang: I18nContext.current()?.lang,
        }),
      );
    }
  }

  /**
   * Validate PDF file
   */
  private validatePdfFile(file: Express.Multer.File): void {
    if (!ALLOWED_PDF_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        this.i18n.t('candidates.invalidPdfType', {
          lang: I18nContext.current()?.lang,
        }),
      );
    }

    if (file.size > MAX_PDF_SIZE) {
      throw new BadRequestException(
        this.i18n.t('candidates.pdfSizeExceeded', {
          lang: I18nContext.current()?.lang,
        }),
      );
    }
  }

  /**
   * Map candidate domain to response DTO
   */
  private mapToResponse(candidate: Candidate): CandidateResponseDto {
    return {
      id: candidate.id,
      nama: candidate.nama,
      status: candidate.status,
      photo_url: candidate.photoUrl,
      visi_misi: candidate.visiMisi,
      program_kerja: candidate.programKerja,
      grand_design_url: candidate.grandDesignUrl,
      created_at: candidate.createdAt,
      updated_at: candidate.updatedAt,
    };
  }

  /**
   * Create a new candidate
   */
  async create(
    dto: CreateCandidateDto,
    files: {
      photo?: Express.Multer.File[];
      grand_design?: Express.Multer.File[];
    },
    adminId: string,
  ): Promise<SingleCandidateResponseDto> {
    // Check for duplicate name
    const exists = await this.candidateRepository.existsByName(dto.nama);
    if (exists) {
      throw new ConflictException(
        this.i18n.t('candidates.duplicateName', {
          lang: I18nContext.current()?.lang,
        }),
      );
    }

    // Validate and upload photo if provided
    let photoUrl: string | null = null;
    if (files.photo && files.photo[0]) {
      this.validatePhotoFile(files.photo[0]);
      try {
        photoUrl = await this.storageService.uploadPhoto(files.photo[0]);
      } catch (error) {
        throw new InternalServerErrorException(
          this.i18n.t('candidates.uploadFailed', {
            lang: I18nContext.current()?.lang,
          }),
        );
      }
    }

    // Validate and upload grand design if provided
    let grandDesignUrl: string | null = null;
    if (files.grand_design && files.grand_design[0]) {
      this.validatePdfFile(files.grand_design[0]);
      try {
        grandDesignUrl = await this.storageService.uploadGrandDesign(
          files.grand_design[0],
        );
      } catch (error) {
        // Cleanup photo if grand design upload fails
        if (photoUrl) {
          await this.storageService.deleteFile(photoUrl);
        }
        throw new InternalServerErrorException(
          this.i18n.t('candidates.uploadFailed', {
            lang: I18nContext.current()?.lang,
          }),
        );
      }
    }

    // Create candidate
    const candidate = new Candidate();
    candidate.nama = dto.nama;
    candidate.status = dto.status || CandidateStatus.ACTIVE;
    candidate.photoUrl = photoUrl;
    candidate.visiMisi = this.sanitizeContent(dto.visi_misi);
    candidate.programKerja = this.sanitizeContent(dto.program_kerja);
    candidate.grandDesignUrl = grandDesignUrl;

    const saved = await this.candidateRepository.create(candidate);

    // Log action
    this.auditLogService.log({
      actorId: adminId,
      actorType: AuditActorType.ADMIN,
      action: AuditAction.CANDIDATE_CREATED,
      resourceType: AuditResourceType.CANDIDATE,
      resourceId: saved.id,
      status: AuditStatus.SUCCESS,
      details: {
        nama: saved.nama,
        candidateStatus: saved.status,
        hasPhoto: !!photoUrl,
        hasGrandDesign: !!grandDesignUrl,
      },
    });

    return { data: this.mapToResponse(saved) };
  }

  /**
   * Find many candidates with pagination
   * @param activeOnly - If true, only return candidates with status 'active' (used by public endpoint)
   */
  async findMany(
    query: QueryCandidatesDto,
    activeOnly: boolean = false,
  ): Promise<PaginatedCandidatesResponseDto> {
    const { data, total } = await this.candidateRepository.findMany(
      query,
      activeOnly,
    );
    const page = query.page || 1;
    const limit = query.limit || 10;
    const totalPages = Math.ceil(total / limit);

    const meta: PaginationMetaDto = {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };

    return {
      data: data.map((c) => this.mapToResponse(c)),
      meta,
    };
  }

  /**
   * Find candidate by ID
   * @param activeOnly - If true, only return candidate with status 'active' (used by public endpoint)
   */
  async findById(
    id: string,
    activeOnly: boolean = false,
  ): Promise<SingleCandidateResponseDto> {
    const candidate = await this.candidateRepository.findById(id, activeOnly);

    if (!candidate) {
      throw new NotFoundException(
        this.i18n.t('candidates.notFound', {
          lang: I18nContext.current()?.lang,
        }),
      );
    }

    return { data: this.mapToResponse(candidate) };
  }

  /**
   * Update candidate
   */
  async update(
    id: string,
    dto: UpdateCandidateDto,
    files: {
      photo?: Express.Multer.File[];
      grand_design?: Express.Multer.File[];
    },
    adminId: string,
  ): Promise<SingleCandidateResponseDto> {
    // Check if voting is active
    const isActive = await this.electionConfigRepository.isVotingActive();
    if (isActive) {
      throw new ForbiddenException(
        this.i18n.t('candidates.votingActiveCannotModify', {
          lang: I18nContext.current()?.lang,
        }),
      );
    }

    // Find existing candidate
    const existing = await this.candidateRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(
        this.i18n.t('candidates.notFound', {
          lang: I18nContext.current()?.lang,
        }),
      );
    }

    // Check for duplicate name if updating name
    if (dto.nama && dto.nama !== existing.nama) {
      const nameExists = await this.candidateRepository.existsByName(
        dto.nama,
        id,
      );
      if (nameExists) {
        throw new ConflictException(
          this.i18n.t('candidates.duplicateName', {
            lang: I18nContext.current()?.lang,
          }),
        );
      }
    }

    // Build update data
    const updateData: Partial<Candidate> = {};

    if (dto.nama !== undefined) updateData.nama = dto.nama;
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.visi_misi !== undefined)
      updateData.visiMisi = this.sanitizeContent(dto.visi_misi);
    if (dto.program_kerja !== undefined)
      updateData.programKerja = this.sanitizeContent(dto.program_kerja);

    // Handle photo update
    if (files.photo && files.photo[0]) {
      this.validatePhotoFile(files.photo[0]);
      const newPhotoUrl = await this.storageService.uploadPhoto(files.photo[0]);

      // Delete old photo
      if (existing.photoUrl) {
        await this.storageService.deleteFile(existing.photoUrl);
      }

      updateData.photoUrl = newPhotoUrl;
    }

    // Handle grand design update
    if (files.grand_design && files.grand_design[0]) {
      this.validatePdfFile(files.grand_design[0]);
      const newGrandDesignUrl = await this.storageService.uploadGrandDesign(
        files.grand_design[0],
      );

      // Delete old grand design
      if (existing.grandDesignUrl) {
        await this.storageService.deleteFile(existing.grandDesignUrl);
      }

      updateData.grandDesignUrl = newGrandDesignUrl;
    }

    const updated = await this.candidateRepository.update(id, updateData);

    // Log action
    this.auditLogService.log({
      actorId: adminId,
      actorType: AuditActorType.ADMIN,
      action: AuditAction.CANDIDATE_UPDATED,
      resourceType: AuditResourceType.CANDIDATE,
      resourceId: id,
      status: AuditStatus.SUCCESS,
      details: {
        updatedFields: Object.keys(updateData),
        nama: updated.nama,
      },
    });

    return { data: this.mapToResponse(updated) };
  }

  /**
   * Delete candidate
   */
  async delete(
    id: string,
    adminId: string,
  ): Promise<DeleteCandidateResponseDto> {
    // Check if voting is active
    const isActive = await this.electionConfigRepository.isVotingActive();
    if (isActive) {
      throw new ForbiddenException(
        this.i18n.t('candidates.votingActiveCannotDelete', {
          lang: I18nContext.current()?.lang,
        }),
      );
    }

    // Find existing candidate
    const existing = await this.candidateRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(
        this.i18n.t('candidates.notFound', {
          lang: I18nContext.current()?.lang,
        }),
      );
    }

    // Delete files from storage
    if (existing.photoUrl) {
      await this.storageService.deleteFile(existing.photoUrl);
    }
    if (existing.grandDesignUrl) {
      await this.storageService.deleteFile(existing.grandDesignUrl);
    }

    // Delete from database
    await this.candidateRepository.delete(id);

    // Log action
    this.auditLogService.log({
      actorId: adminId,
      actorType: AuditActorType.ADMIN,
      action: AuditAction.CANDIDATE_DELETED,
      resourceType: AuditResourceType.CANDIDATE,
      resourceId: id,
      status: AuditStatus.SUCCESS,
      details: {
        nama: existing.nama,
        deletedPhotoUrl: existing.photoUrl,
        deletedGrandDesignUrl: existing.grandDesignUrl,
      },
    });

    return {
      message: this.i18n.t('candidates.deleted', {
        lang: I18nContext.current()?.lang,
      }),
      id,
    };
  }
}
