import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { VoterRepositoryInterface } from '../../../../interfaces/voter.repository.interface';
import { Voter } from '../../../../../admin-voters/domain/voter';
import { VoterEntity } from '../../../../../admin-voters/infrastructure/persistence/relational/entities/voter.entity';
import { VoterMapper } from '../../../../../admin-voters/infrastructure/persistence/relational/mappers/voter.mapper';

@Injectable()
export class VoterRepository implements VoterRepositoryInterface {
  constructor(
    @InjectRepository(VoterEntity)
    private readonly voterRepository: Repository<VoterEntity>,
  ) {}

  async findById(id: string): Promise<Voter | null> {
    const entity = await this.voterRepository.findOne({
      where: { id },
    });

    if (!entity) {
      return null;
    }

    return VoterMapper.toDomain(entity);
  }

  async markAsVoted(
    id: string,
    votedAt: Date,
    queryRunner: QueryRunner,
  ): Promise<void> {
    await queryRunner.manager.update(VoterEntity, id, {
      hasVoted: true,
      votedAt,
    });
  }
}
