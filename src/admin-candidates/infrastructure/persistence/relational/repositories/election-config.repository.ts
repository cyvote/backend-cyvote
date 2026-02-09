import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ElectionConfigRepositoryInterface } from '../../../../interfaces/election-config.repository.interface';
import { ElectionConfigEntity } from '../entities/election-config.entity';

/**
 * Repository for checking election status
 */
@Injectable()
export class ElectionConfigRepository
  implements ElectionConfigRepositoryInterface
{
  constructor(
    @InjectRepository(ElectionConfigEntity)
    private readonly repository: Repository<ElectionConfigEntity>,
  ) {}

  /**
   * Check if voting is currently active
   * Returns true if any election has status 'ACTIVE'
   */
  async isVotingActive(): Promise<boolean> {
    const activeElection = await this.repository.findOne({
      where: { status: 'ACTIVE' },
    });

    return activeElection !== null;
  }
}
