import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { AuditLog } from '../../../../domain/audit-log';
import { AuditLogRepositoryInterface } from '../../../../interfaces/audit-log.repository.interface';
import { AuditLogSchemaClass } from '../entities/audit-log.schema';
import { AuditLogMapper } from '../mappers/audit-log.mapper';
import { AuditLogQueryDto } from '../../../../dto/audit-log-query.dto';
import { NullableType } from '../../../../../../utils/types/nullable.type';

@Injectable()
export class AuditLogDocumentRepository implements AuditLogRepositoryInterface {
  constructor(
    @InjectModel(AuditLogSchemaClass.name)
    private readonly auditLogModel: Model<AuditLogSchemaClass>,
  ) {}

  async create(data: AuditLog): Promise<AuditLog> {
    const persistenceModel = AuditLogMapper.toPersistence(data);
    const createdAuditLog = new this.auditLogModel(persistenceModel);
    const auditLogObject = await createdAuditLog.save();
    return AuditLogMapper.toDomain(auditLogObject);
  }

  async findMany(filters: AuditLogQueryDto): Promise<AuditLog[]> {
    const where: FilterQuery<AuditLogSchemaClass> = {};

    if (filters.actorId) {
      where.actorId = filters.actorId;
    }

    if (filters.actorType) {
      where.actorType = filters.actorType;
    }

    if (filters.action) {
      where.action = filters.action;
    }

    if (filters.resourceType) {
      where.resourceType = filters.resourceType;
    }

    if (filters.resourceId) {
      where.resourceId = filters.resourceId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.ipAddress) {
      where.ipAddress = filters.ipAddress;
    }

    if (filters.createdFrom || filters.createdTo) {
      where.createdAt = {};
      if (filters.createdFrom) {
        where.createdAt.$gte = filters.createdFrom;
      }
      if (filters.createdTo) {
        where.createdAt.$lte = filters.createdTo;
      }
    }

    const page = filters.page || 1;
    const limit = filters.limit || 20;

    const auditLogObjects = await this.auditLogModel
      .find(where)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return auditLogObjects.map((auditLogObject) =>
      AuditLogMapper.toDomain(auditLogObject),
    );
  }

  async findOne(id: string | number): Promise<NullableType<AuditLog>> {
    const auditLogObject = await this.auditLogModel.findById(id);
    return auditLogObject ? AuditLogMapper.toDomain(auditLogObject) : null;
  }

  async count(
    filters: Omit<AuditLogQueryDto, 'page' | 'limit'>,
  ): Promise<number> {
    const where: FilterQuery<AuditLogSchemaClass> = {};

    if (filters.actorId) {
      where.actorId = filters.actorId;
    }

    if (filters.actorType) {
      where.actorType = filters.actorType;
    }

    if (filters.action) {
      where.action = filters.action;
    }

    if (filters.resourceType) {
      where.resourceType = filters.resourceType;
    }

    if (filters.resourceId) {
      where.resourceId = filters.resourceId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.ipAddress) {
      where.ipAddress = filters.ipAddress;
    }

    if (filters.createdFrom || filters.createdTo) {
      where.createdAt = {};
      if (filters.createdFrom) {
        where.createdAt.$gte = filters.createdFrom;
      }
      if (filters.createdTo) {
        where.createdAt.$lte = filters.createdTo;
      }
    }

    return this.auditLogModel.countDocuments(where);
  }
}
