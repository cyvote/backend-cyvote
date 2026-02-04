import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { VoteRepositoryInterface } from '../../../../interfaces/vote.repository.interface';
import { Vote } from '../../../../domain/vote.model';
import { VoteHash } from '../../../../domain/vote-hash.model';
import { VoteEntity } from '../entities/vote.entity';
import { VoteHashEntity } from '../entities/vote-hash.entity';
import { VoteMapper } from '../mappers/vote.mapper';
import { VoteHashMapper } from '../mappers/vote-hash.mapper';

@Injectable()
export class VoteRepository implements VoteRepositoryInterface {
  constructor(
    @InjectRepository(VoteEntity)
    private readonly voteRepository: Repository<VoteEntity>,
  ) {}

  async findByVoterId(voterId: string): Promise<Vote | null> {
    const entity = await this.voteRepository.findOne({
      where: { voterId },
    });

    if (!entity) {
      return null;
    }

    return VoteMapper.toDomain(entity);
  }

  async create(vote: Vote): Promise<Vote> {
    const entity = VoteMapper.toEntity(vote);
    const savedEntity = await this.voteRepository.save(entity);
    return VoteMapper.toDomain(savedEntity);
  }

  async createWithTransaction(
    vote: Vote,
    voteHash: VoteHash,
    queryRunner: QueryRunner,
  ): Promise<Vote> {
    // Create vote entity
    const voteEntity = VoteMapper.toEntity(vote);
    const savedVoteEntity = await queryRunner.manager.save(
      VoteEntity,
      voteEntity,
    );

    // Create vote hash entity with the saved vote ID
    const voteHashEntity = VoteHashMapper.toEntity(voteHash);
    voteHashEntity.voteId = savedVoteEntity.id;
    await queryRunner.manager.save(VoteHashEntity, voteHashEntity);

    return VoteMapper.toDomain(savedVoteEntity);
  }
}
