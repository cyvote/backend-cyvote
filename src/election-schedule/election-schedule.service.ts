import { Inject, Injectable } from '@nestjs/common';
import { I18nContext, I18nService } from 'nestjs-i18n';
import { ElectionConfigRepositoryInterface } from './interfaces/election-config.repository.interface';
import { AuditLogService } from '../audit-log/audit-log.service';
import { AuditAction } from '../audit-log/enums/audit-action.enum';
import { AuditActorType } from '../audit-log/enums/audit-actor-type.enum';
import { AuditStatus } from '../audit-log/enums/audit-status.enum';
import { AuditResourceType } from '../audit-log/enums/audit-resource-type.enum';
import { ElectionConfig, ElectionStatus } from './domain/election-config.model';
import {
  SetScheduleDto,
  ExtendElectionDto,
  ElectionConfigResponseDto,
  SingleElectionConfigResponseDto,
  PublicElectionStatusDto,
  PublicElectionStatusResponseDto,
} from './dto';
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
import { ElectionExtensionEmailService } from './election-extension-email.service';

@Injectable()
export class ElectionScheduleService {
  constructor(
    @Inject('ElectionConfigRepositoryInterface')
    private readonly electionConfigRepository: ElectionConfigRepositoryInterface,
    private readonly auditLogService: AuditLogService,
    private readonly electionExtensionEmailService: ElectionExtensionEmailService,
    private readonly i18n: I18nService,
  ) {}

  /**
   * Set election schedule (SUPERADMIN only)
   */
  async setSchedule(
    dto: SetScheduleDto,
    adminId: string,
  ): Promise<SingleElectionConfigResponseDto> {
    // Check if election config already exists
    const existingConfig =
      await this.electionConfigRepository.findCurrentConfig();
    if (existingConfig) {
      throw new ElectionConfigAlreadyExistsException(
        this.i18n.t('electionSchedule.configAlreadyExists', {
          lang: I18nContext.current()?.lang,
        }),
      );
    }

    // Parse dates
    const startDate = ElectionConfig.parseWibDate(dto.startDate);
    const endDate = ElectionConfig.parseWibDate(dto.endDate);

    // Validate dates
    this.validateSchedule(startDate, endDate);

    // Create election config domain object
    const electionConfig = new ElectionConfig({
      startDate,
      endDate,
      status: ElectionStatus.SCHEDULED,
      createdBy: adminId,
      resultsPublishedAt: null,
    });

    // Save to database
    const createdConfig =
      await this.electionConfigRepository.create(electionConfig);

    // Log audit
    this.auditLogService.log({
      actorId: adminId,
      actorType: AuditActorType.ADMIN,
      action: AuditAction.ELECTION_SCHEDULED,
      resourceType: AuditResourceType.ELECTION_CONFIG,
      resourceId: createdConfig.id,
      status: AuditStatus.SUCCESS,
      details: {
        startDate: ElectionConfig.formatToWib(createdConfig.startDate),
        endDate: ElectionConfig.formatToWib(createdConfig.endDate),
        status: createdConfig.status,
      },
    });

    return {
      data: this.mapToResponseDto(createdConfig),
      message: this.i18n.t('electionSchedule.scheduleCreated', {
        lang: I18nContext.current()?.lang,
      }),
    };
  }

  /**
   * Get current election configuration (SUPERADMIN only)
   */
  async getCurrentConfig(): Promise<SingleElectionConfigResponseDto> {
    const config = await this.electionConfigRepository.findCurrentConfig();

    if (!config) {
      throw new ElectionConfigNotFoundException(
        this.i18n.t('electionSchedule.noActiveElection', {
          lang: I18nContext.current()?.lang,
        }),
      );
    }

    return {
      data: this.mapToResponseDto(config),
      message: this.i18n.t('electionSchedule.configRetrieved', {
        lang: I18nContext.current()?.lang,
      }),
    };
  }

  /**
   * Get public election status (no auth required)
   */
  async getPublicStatus(): Promise<PublicElectionStatusResponseDto> {
    const config = await this.electionConfigRepository.findCurrentConfig();

    if (!config) {
      // Return a default response when no config exists
      return {
        data: {
          status: ElectionStatus.SCHEDULED,
          startDate: '',
          endDate: '',
          isVotingOpen: false,
        },
        message: this.i18n.t('electionSchedule.noActiveElection', {
          lang: I18nContext.current()?.lang,
        }),
      };
    }

    const publicStatus: PublicElectionStatusDto = {
      status: config.status,
      startDate: ElectionConfig.formatToWib(config.startDate),
      endDate: ElectionConfig.formatToWib(config.endDate),
      isVotingOpen: config.status === ElectionStatus.ACTIVE,
    };

    return {
      data: publicStatus,
      message: this.i18n.t('electionSchedule.configRetrieved', {
        lang: I18nContext.current()?.lang,
      }),
    };
  }

  /**
   * Extend election end date (SUPERADMIN only)
   */
  async extendElection(
    dto: ExtendElectionDto,
    adminId: string,
  ): Promise<SingleElectionConfigResponseDto> {
    // Get current config
    const currentConfig =
      await this.electionConfigRepository.findCurrentConfig();

    if (!currentConfig) {
      throw new ElectionConfigNotFoundException(
        this.i18n.t('electionSchedule.noActiveElection', {
          lang: I18nContext.current()?.lang,
        }),
      );
    }

    // Validate election is ACTIVE
    if (currentConfig.status !== ElectionStatus.ACTIVE) {
      throw new ElectionNotActiveException(
        this.i18n.t('electionSchedule.notActive', {
          lang: I18nContext.current()?.lang,
        }),
      );
    }

    // Parse new end date
    const newEndDate = ElectionConfig.parseWibDate(dto.newEndDate);

    // Validate extension
    this.validateExtension(currentConfig, newEndDate);

    // Store old end date for audit
    const oldEndDate = currentConfig.endDate;

    // Update end date
    const updatedConfig = await this.electionConfigRepository.updateEndDate(
      currentConfig.id,
      newEndDate,
    );

    // Log audit
    this.auditLogService.log({
      actorId: adminId,
      actorType: AuditActorType.ADMIN,
      action: AuditAction.ELECTION_EXTENDED,
      resourceType: AuditResourceType.ELECTION_CONFIG,
      resourceId: updatedConfig.id,
      status: AuditStatus.SUCCESS,
      details: {
        previousEndDate: ElectionConfig.formatToWib(oldEndDate),
        newEndDate: ElectionConfig.formatToWib(newEndDate),
        reason: dto.reason,
      },
    });

    // Send extension notification emails asynchronously (fire-and-forget)
    this.electionExtensionEmailService.sendExtensionNotifications(
      newEndDate,
      dto.reason,
    );

    return {
      data: this.mapToResponseDto(updatedConfig),
      message: this.i18n.t('electionSchedule.electionExtended', {
        lang: I18nContext.current()?.lang,
      }),
    };
  }

  /**
   * Validate schedule dates
   */
  private validateSchedule(startDate: Date, endDate: Date): void {
    // Check end is after start
    if (endDate.getTime() <= startDate.getTime()) {
      throw new EndDateMustBeAfterStartException(
        this.i18n.t('electionSchedule.endMustBeAfterStart', {
          lang: I18nContext.current()?.lang,
        }),
      );
    }

    // Check start is in future
    if (startDate.getTime() <= Date.now()) {
      throw new StartDateMustBeFutureException(
        this.i18n.t('electionSchedule.startMustBeFuture', {
          lang: I18nContext.current()?.lang,
        }),
      );
    }

    // Check duration is between 6 hours and 7 days
    const durationMs = endDate.getTime() - startDate.getTime();
    const sixHoursMs = 6 * 60 * 60 * 1000;
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    if (durationMs < sixHoursMs || durationMs > sevenDaysMs) {
      throw new InvalidElectionDurationException(
        this.i18n.t('electionSchedule.invalidDuration', {
          lang: I18nContext.current()?.lang,
        }),
      );
    }
  }

  /**
   * Validate extension
   */
  private validateExtension(
    currentConfig: ElectionConfig,
    newEndDate: Date,
  ): void {
    // Check new end date is after current end date
    if (newEndDate.getTime() <= currentConfig.endDate.getTime()) {
      throw new InvalidExtensionDateException(
        this.i18n.t('electionSchedule.newEndMustBeAfterCurrent', {
          lang: I18nContext.current()?.lang,
        }),
      );
    }

    // Check extension doesn't exceed 24 hours
    const extensionMs = newEndDate.getTime() - currentConfig.endDate.getTime();
    const twentyFourHoursMs = 24 * 60 * 60 * 1000;

    if (extensionMs > twentyFourHoursMs) {
      throw new ExtensionExceedsMaximumException(
        this.i18n.t('electionSchedule.extensionExceedsMax', {
          lang: I18nContext.current()?.lang,
        }),
      );
    }
  }

  /**
   * Map domain model to response DTO
   */
  private mapToResponseDto(config: ElectionConfig): ElectionConfigResponseDto {
    return {
      id: config.id,
      startDate: ElectionConfig.formatToWib(config.startDate),
      endDate: ElectionConfig.formatToWib(config.endDate),
      status: config.status,
      createdBy: config.createdBy,
      createdAt: ElectionConfig.formatToWib(config.createdAt),
      updatedAt: ElectionConfig.formatToWib(config.updatedAt),
    };
  }
}
