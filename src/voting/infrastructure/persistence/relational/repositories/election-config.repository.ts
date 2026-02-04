import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ElectionConfigRepositoryInterface } from '../../../../interfaces/election-config.repository.interface';
import { ElectionConfigEntity } from '../../../../../election-schedule/infrastructure/persistence/relational/entities/election-config.entity';
import {
  ElectionConfig,
  ElectionStatus,
} from '../../../../../election-schedule/domain/election-config.model';

@Injectable()
export class ElectionConfigRepository
  implements ElectionConfigRepositoryInterface
{
  constructor(
    @InjectRepository(ElectionConfigEntity)
    private readonly electionConfigRepository: Repository<ElectionConfigEntity>,
  ) {}

  async findActive(): Promise<ElectionConfig | null> {
    const entity = await this.electionConfigRepository.findOne({
      where: { status: ElectionStatus.ACTIVE },
    });

    if (!entity) {
      return null;
    }

    return entity.toDomain();
  }

  async isElectionActive(): Promise<boolean> {
    const count = await this.electionConfigRepository.count({
      where: { status: ElectionStatus.ACTIVE },
    });
    return count > 0;
  }
}
