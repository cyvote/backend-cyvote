import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, FindOptionsWhere, Repository } from 'typeorm';
import { AuditLogEntity } from '../entities/audit-log.entity';
import { AuditLog } from '../../../../domain/audit-log';
import { AuditLogRepositoryInterface } from '../../../../interfaces/audit-log.repository.interface';
import { AuditLogMapper } from '../mappers/audit-log.mapper';
import { AuditLogQueryDto } from '../../../../dto/audit-log-query.dto';
import { NullableType } from '../../../../../utils/types/nullable.type';

@Injectable()
export class AuditLogRelationalRepository
  implements AuditLogRepositoryInterface
{
  constructor(
    @InjectRepository(AuditLogEntity)
    private readonly auditLogRepository: Repository<AuditLogEntity>,
  ) {}

  async create(data: AuditLog): Promise<AuditLog> {
    const persistenceModel = AuditLogMapper.toPersistence(data);
    const newEntity = await this.auditLogRepository.save(
      this.auditLogRepository.create(persistenceModel),
    );
    return AuditLogMapper.toDomain(newEntity);
  }

  async findMany(filters: AuditLogQueryDto): Promise<AuditLog[]> {
    const where: FindOptionsWhere<AuditLogEntity> = {};

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
      const start = filters.createdFrom || new Date(0);
      const end = filters.createdTo || new Date();
      where.createdAt = Between(start, end);
    }

    const page = filters.page || 1;
    const limit = filters.limit || 20;

    const entities = await this.auditLogRepository.find({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return entities.map((entity) => AuditLogMapper.toDomain(entity));
  }

  async findOne(id: string | number): Promise<NullableType<AuditLog>> {
    const entity = await this.auditLogRepository.findOne({
      where: { id: Number(id) },
    });

    return entity ? AuditLogMapper.toDomain(entity) : null;
  }

  async count(
    filters: Omit<AuditLogQueryDto, 'page' | 'limit'>,
  ): Promise<number> {
    const where: FindOptionsWhere<AuditLogEntity> = {};

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
      const start = filters.createdFrom || new Date(0);
      const end = filters.createdTo || new Date();
      where.createdAt = Between(start, end);
    }

    return this.auditLogRepository.count({ where });
  }
}
