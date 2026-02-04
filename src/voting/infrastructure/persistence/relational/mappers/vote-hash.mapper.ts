import { VoteHash } from '../../../../domain/vote-hash.model';
import { VoteHashEntity } from '../entities/vote-hash.entity';

export class VoteHashMapper {
  static toDomain(entity: VoteHashEntity): VoteHash {
    return new VoteHash({
      id: entity.id,
      voteId: entity.voteId,
      hash: entity.hash,
      verificationHash: entity.verificationHash,
      createdAt: entity.createdAt,
    });
  }

  static toEntity(domain: VoteHash): VoteHashEntity {
    const entity = new VoteHashEntity();
    entity.id = domain.id;
    entity.voteId = domain.voteId;
    entity.hash = domain.hash;
    entity.verificationHash = domain.verificationHash;
    entity.createdAt = domain.createdAt;
    return entity;
  }
}
