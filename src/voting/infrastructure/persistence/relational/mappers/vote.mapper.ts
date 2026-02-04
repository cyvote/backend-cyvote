import { Vote } from '../../../../domain/vote.model';
import { VoteEntity } from '../entities/vote.entity';

export class VoteMapper {
  static toDomain(entity: VoteEntity): Vote {
    return new Vote({
      id: entity.id,
      voterId: entity.voterId,
      candidateId: entity.candidateId,
      voteHash: entity.voteHash,
      votedAt: entity.votedAt,
      receiptCode: entity.receiptCode,
    });
  }

  static toEntity(domain: Vote): VoteEntity {
    const entity = new VoteEntity();
    entity.id = domain.id;
    entity.voterId = domain.voterId;
    entity.candidateId = domain.candidateId;
    entity.voteHash = domain.voteHash;
    entity.votedAt = domain.votedAt;
    entity.receiptCode = domain.receiptCode;
    return entity;
  }

  static toPartialEntity(domain: Partial<Vote>): Partial<VoteEntity> {
    const entity: Partial<VoteEntity> = {};
    if (domain.voterId !== undefined) entity.voterId = domain.voterId;
    if (domain.candidateId !== undefined)
      entity.candidateId = domain.candidateId;
    if (domain.voteHash !== undefined) entity.voteHash = domain.voteHash;
    if (domain.votedAt !== undefined) entity.votedAt = domain.votedAt;
    if (domain.receiptCode !== undefined)
      entity.receiptCode = domain.receiptCode;
    return entity;
  }
}
