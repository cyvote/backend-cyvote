import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ElectionConfigEntity } from '../entities/election-config.entity';
import { ElectionConfigRepositoryInterface } from '../../../../interfaces/election-config.repository.interface';
import {
  ElectionConfig,
  ElectionStatus,
} from '../../../../domain/election-config.model';

@Injectable()
export class ElectionConfigRelationalRepository
  implements ElectionConfigRepositoryInterface
{
  constructor(
    @InjectRepository(ElectionConfigEntity)
    private readonly repository: Repository<ElectionConfigEntity>,
  ) {}

  async create(config: ElectionConfig): Promise<ElectionConfig> {
    const entity = ElectionConfigEntity.fromDomain(config);
    const savedEntity = await this.repository.save(entity);
    return savedEntity.toDomain();
  }

  async findCurrentConfig(): Promise<ElectionConfig | null> {
    // Get the most recent election config ordered by created_at desc
    const entity = await this.repository.findOne({
      where: {},
      order: { createdAt: 'DESC' },
    });

    if (!entity) {
      return null;
    }

    return entity.toDomain();
  }

  async updateStatus(
    id: string,
    status: ElectionStatus,
  ): Promise<ElectionConfig> {
    await this.repository.update(id, { status });
    const entity = await this.repository.findOneOrFail({ where: { id } });
    return entity.toDomain();
  }

  async updateEndDate(id: string, endDate: Date): Promise<ElectionConfig> {
    await this.repository.update(id, { endDate });
    const entity = await this.repository.findOneOrFail({ where: { id } });
    return entity.toDomain();
  }
}
