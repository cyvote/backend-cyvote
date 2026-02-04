import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Column, Entity, PrimaryGeneratedColumn, Repository } from 'typeorm';
import { ElectionConfigRepositoryInterface } from '../../../../interfaces/election-config.repository.interface';

/**
 * TypeORM entity for election_config table (read-only for status check)
 */
@Entity('election_config')
class ElectionConfigEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20 })
  status: string;
}

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

export { ElectionConfigEntity };
