import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ElectionConfigRepositoryInterface } from '../../../../interfaces/election-config.repository.interface';
import { ElectionConfigEntity } from '../entities/election-config.entity';
import { ElectionConfig } from '../../../../domain/election-config.model';
import { NullableType } from '../../../../../utils/types/nullable.type';

@Injectable()
export class ElectionConfigRepository
  implements ElectionConfigRepositoryInterface
{
  constructor(
    @InjectRepository(ElectionConfigEntity)
    private readonly electionConfigRepository: Repository<ElectionConfigEntity>,
  ) {}

  async findActiveElection(): Promise<NullableType<ElectionConfig>> {
    const entity = await this.electionConfigRepository.findOne({
      where: { status: 'ACTIVE' },
    });

    return entity ? entity.toDomain() : null;
  }

  async findLatest(): Promise<NullableType<ElectionConfig>> {
    const entity = await this.electionConfigRepository.findOne({
      order: { createdAt: 'DESC' },
    });

    return entity ? entity.toDomain() : null;
  }
}
