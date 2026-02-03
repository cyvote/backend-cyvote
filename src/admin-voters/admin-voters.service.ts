import { Inject, Injectable } from '@nestjs/common';
import { I18nContext, I18nService } from 'nestjs-i18n';
import { VoterRepositoryInterface } from './interfaces/voter.repository.interface';
import { AuditLogService } from '../audit-log/audit-log.service';
import { AuditAction } from '../audit-log/enums/audit-action.enum';
import { AuditActorType } from '../audit-log/enums/audit-actor-type.enum';
import { AuditStatus } from '../audit-log/enums/audit-status.enum';
import { AuditResourceType } from '../audit-log/enums/audit-resource-type.enum';
import { Voter } from './domain/voter';
import { CreateVoterDto } from './dto/create-voter.dto';
import { UpdateVoterDto } from './dto/update-voter.dto';
import { QueryVotersDto } from './dto/query-voters.dto';
import {
  VoterResponseDto,
  SingleVoterResponseDto,
  DeleteVoterResponseDto,
  PaginatedVotersResponseDto,
  PaginationMetaDto,
} from './dto';
import {
  VoterNotFoundException,
  VoterNimAlreadyExistsException,
  VoterAlreadyVotedException,
  VoterNotDeletedException,
  InvalidEmailFormatException,
} from './errors';

@Injectable()
export class AdminVotersService {
  constructor(
    @Inject('VoterRepositoryInterface')
    private readonly voterRepository: VoterRepositoryInterface,
    private readonly auditLogService: AuditLogService,
    private readonly i18n: I18nService,
  ) {}

  async create(
    dto: CreateVoterDto,
    adminId: string,
  ): Promise<SingleVoterResponseDto> {
    // Validate email format matches NIM
    this.validateEmailFormat(dto.nim, dto.email);

    // Check if NIM already exists
    const existingVoter = await this.voterRepository.findByNimIncludingDeleted(
      dto.nim,
    );
    if (existingVoter) {
      throw new VoterNimAlreadyExistsException(
        this.i18n.t('adminVoters.nimAlreadyExists', {
          lang: I18nContext.current()?.lang,
        }),
      );
    }

    // Create voter domain object
    const voter = new Voter();
    voter.nim = dto.nim;
    voter.namaLengkap = dto.namaLengkap;
    voter.angkatan = dto.angkatan;
    voter.email = dto.email;
    voter.hasVoted = false;
    voter.votedAt = null;

    // Save to database
    const createdVoter = await this.voterRepository.create(voter);

    // Log audit
    this.auditLogService.log({
      actorId: adminId,
      actorType: AuditActorType.ADMIN,
      action: AuditAction.VOTER_CREATED,
      resourceType: AuditResourceType.VOTER,
      resourceId: createdVoter.id,
      status: AuditStatus.SUCCESS,
      details: {
        nim: createdVoter.nim,
        namaLengkap: createdVoter.namaLengkap,
        angkatan: createdVoter.angkatan,
        email: createdVoter.email,
      },
    });

    return {
      data: this.mapToResponseDto(createdVoter),
      message: this.i18n.t('adminVoters.voterCreated', {
        lang: I18nContext.current()?.lang,
      }),
    };
  }

  async findMany(query: QueryVotersDto): Promise<PaginatedVotersResponseDto> {
    const { data, total } = await this.voterRepository.findMany(query);
    const page = query.page || 1;
    const limit = query.limit || 10;
    const totalPages = Math.ceil(total / limit);

    const meta: PaginationMetaDto = {
      total,
      page,
      limit,
      totalPages,
      hasPreviousPage: page > 1,
      hasNextPage: page < totalPages,
      filters: {
        status: query.filter || 'all',
        search: query.search,
        angkatan: query.angkatan,
        sort: query.sort,
        order: query.order,
      },
    };

    const hasResults = data.length > 0;
    const message = hasResults
      ? this.i18n.t('adminVoters.votersRetrieved', {
          lang: I18nContext.current()?.lang,
        })
      : this.i18n.t('adminVoters.noResultsFound', {
          lang: I18nContext.current()?.lang,
        });

    return {
      data: data.map((voter) => this.mapToResponseDto(voter)),
      meta,
      message,
    };
  }

  async findOne(id: string): Promise<SingleVoterResponseDto> {
    const voter = await this.voterRepository.findById(id);

    if (!voter) {
      throw new VoterNotFoundException(
        this.i18n.t('adminVoters.voterNotFound', {
          lang: I18nContext.current()?.lang,
        }),
      );
    }

    return {
      data: this.mapToResponseDto(voter),
      message: this.i18n.t('adminVoters.voterRetrieved', {
        lang: I18nContext.current()?.lang,
      }),
    };
  }

  async update(
    id: string,
    dto: UpdateVoterDto,
    adminId: string,
  ): Promise<SingleVoterResponseDto> {
    // Find existing voter
    const existingVoter = await this.voterRepository.findById(id);

    if (!existingVoter) {
      throw new VoterNotFoundException(
        this.i18n.t('adminVoters.voterNotFound', {
          lang: I18nContext.current()?.lang,
        }),
      );
    }

    // Check if voter has already voted
    if (existingVoter.hasVoted) {
      throw new VoterAlreadyVotedException(
        this.i18n.t('adminVoters.cannotModifyVotedVoter', {
          lang: I18nContext.current()?.lang,
        }),
      );
    }

    // If NIM is being changed, check uniqueness
    if (dto.nim && dto.nim !== existingVoter.nim) {
      const voterWithNim = await this.voterRepository.findByNimIncludingDeleted(
        dto.nim,
      );
      if (voterWithNim) {
        throw new VoterNimAlreadyExistsException(
          this.i18n.t('adminVoters.nimAlreadyExists', {
            lang: I18nContext.current()?.lang,
          }),
        );
      }
    }

    // Validate email format if email or NIM is being changed
    const newNim = dto.nim || existingVoter.nim;
    const newEmail = dto.email || existingVoter.email;
    if (dto.email || dto.nim) {
      this.validateEmailFormat(newNim, newEmail);
    }

    // Build update object
    const updateData: Partial<Voter> = {};
    if (dto.nim !== undefined) updateData.nim = dto.nim;
    if (dto.namaLengkap !== undefined) updateData.namaLengkap = dto.namaLengkap;
    if (dto.angkatan !== undefined) updateData.angkatan = dto.angkatan;
    if (dto.email !== undefined) updateData.email = dto.email;

    // Update in database
    const updatedVoter = await this.voterRepository.update(id, updateData);

    // Log audit
    this.auditLogService.log({
      actorId: adminId,
      actorType: AuditActorType.ADMIN,
      action: AuditAction.VOTER_UPDATED,
      resourceType: AuditResourceType.VOTER,
      resourceId: id,
      status: AuditStatus.SUCCESS,
      details: {
        previousData: {
          nim: existingVoter.nim,
          namaLengkap: existingVoter.namaLengkap,
          angkatan: existingVoter.angkatan,
          email: existingVoter.email,
        },
        newData: updateData,
      },
    });

    return {
      data: this.mapToResponseDto(updatedVoter),
      message: this.i18n.t('adminVoters.voterUpdated', {
        lang: I18nContext.current()?.lang,
      }),
    };
  }

  async softDelete(
    id: string,
    adminId: string,
  ): Promise<DeleteVoterResponseDto> {
    // Find existing voter
    const existingVoter = await this.voterRepository.findById(id);

    if (!existingVoter) {
      throw new VoterNotFoundException(
        this.i18n.t('adminVoters.voterNotFound', {
          lang: I18nContext.current()?.lang,
        }),
      );
    }

    // Check if voter has already voted
    if (existingVoter.hasVoted) {
      throw new VoterAlreadyVotedException(
        this.i18n.t('adminVoters.cannotDeleteVotedVoter', {
          lang: I18nContext.current()?.lang,
        }),
      );
    }

    // Soft delete
    await this.voterRepository.softDelete(id);

    // Log audit
    this.auditLogService.log({
      actorId: adminId,
      actorType: AuditActorType.ADMIN,
      action: AuditAction.VOTER_DELETED,
      resourceType: AuditResourceType.VOTER,
      resourceId: id,
      status: AuditStatus.SUCCESS,
      details: {
        nim: existingVoter.nim,
        namaLengkap: existingVoter.namaLengkap,
      },
    });

    return {
      message: this.i18n.t('adminVoters.voterDeleted', {
        lang: I18nContext.current()?.lang,
      }),
    };
  }

  async restore(id: string, adminId: string): Promise<SingleVoterResponseDto> {
    // Find deleted voter
    const deletedVoter = await this.voterRepository.findDeletedById(id);

    if (!deletedVoter) {
      throw new VoterNotDeletedException(
        this.i18n.t('adminVoters.voterNotDeleted', {
          lang: I18nContext.current()?.lang,
        }),
      );
    }

    // Check if NIM is now taken by another voter
    const existingVoter = await this.voterRepository.findByNim(
      deletedVoter.nim,
    );
    if (existingVoter) {
      throw new VoterNimAlreadyExistsException(
        this.i18n.t('adminVoters.nimAlreadyTakenByAnother', {
          lang: I18nContext.current()?.lang,
        }),
      );
    }

    // Restore voter
    const restoredVoter = await this.voterRepository.restore(id);

    // Log audit with VOTER_RESTORED action
    this.auditLogService.log({
      actorId: adminId,
      actorType: AuditActorType.ADMIN,
      action: AuditAction.VOTER_RESTORED,
      resourceType: AuditResourceType.VOTER,
      resourceId: id,
      status: AuditStatus.SUCCESS,
      details: {
        nim: restoredVoter.nim,
        namaLengkap: restoredVoter.namaLengkap,
      },
    });

    return {
      data: this.mapToResponseDto(restoredVoter),
      message: this.i18n.t('adminVoters.voterRestored', {
        lang: I18nContext.current()?.lang,
      }),
    };
  }

  private validateEmailFormat(nim: string, email: string): void {
    const expectedEmail = `${nim}@mahasiswa.upnvj.ac.id`;
    if (email.toLowerCase() !== expectedEmail.toLowerCase()) {
      throw new InvalidEmailFormatException(
        this.i18n.t('adminVoters.invalidEmailFormat', {
          lang: I18nContext.current()?.lang,
          args: { expectedFormat: expectedEmail },
        }),
      );
    }
  }

  private mapToResponseDto(voter: Voter): VoterResponseDto {
    return {
      id: voter.id,
      nim: voter.nim,
      namaLengkap: voter.namaLengkap,
      angkatan: voter.angkatan,
      email: voter.email,
      hasVoted: voter.hasVoted,
      votedAt: voter.votedAt,
      createdAt: voter.createdAt,
      updatedAt: voter.updatedAt,
    };
  }
}
