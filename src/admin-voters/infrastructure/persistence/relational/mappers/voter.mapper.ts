import { Voter } from '../../../../domain/voter';
import { VoterEntity } from '../entities/voter.entity';

export class VoterMapper {
  static toDomain(entity: VoterEntity): Voter {
    const voter = new Voter();
    voter.id = entity.id;
    voter.nim = entity.nim;
    voter.namaLengkap = entity.namaLengkap;
    voter.angkatan = entity.angkatan;
    voter.email = entity.email;
    voter.hasVoted = entity.hasVoted;
    voter.votedAt = entity.votedAt;
    voter.createdAt = entity.createdAt;
    voter.updatedAt = entity.updatedAt;
    voter.deletedAt = entity.deletedAt;
    return voter;
  }

  static toEntity(domain: Voter): VoterEntity {
    const entity = new VoterEntity();
    if (domain.id) {
      entity.id = domain.id;
    }
    entity.nim = domain.nim;
    entity.namaLengkap = domain.namaLengkap;
    entity.angkatan = domain.angkatan;
    entity.email = domain.email;
    entity.hasVoted = domain.hasVoted ?? false;
    entity.votedAt = domain.votedAt ?? null;
    if (domain.createdAt) {
      entity.createdAt = domain.createdAt;
    }
    if (domain.updatedAt) {
      entity.updatedAt = domain.updatedAt;
    }
    entity.deletedAt = domain.deletedAt ?? null;
    return entity;
  }

  static toPartialEntity(domain: Partial<Voter>): Partial<VoterEntity> {
    const entity: Partial<VoterEntity> = {};

    if (domain.nim !== undefined) {
      entity.nim = domain.nim;
    }
    if (domain.namaLengkap !== undefined) {
      entity.namaLengkap = domain.namaLengkap;
    }
    if (domain.angkatan !== undefined) {
      entity.angkatan = domain.angkatan;
    }
    if (domain.email !== undefined) {
      entity.email = domain.email;
    }
    if (domain.hasVoted !== undefined) {
      entity.hasVoted = domain.hasVoted;
    }
    if (domain.votedAt !== undefined) {
      entity.votedAt = domain.votedAt;
    }

    return entity;
  }
}
