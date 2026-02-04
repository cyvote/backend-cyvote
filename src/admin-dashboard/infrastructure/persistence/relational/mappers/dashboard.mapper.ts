import { VoterEntity } from '../../../../../admin-voters/infrastructure/persistence/relational/entities/voter.entity';
import { VoterMonitor } from '../../../../domain/voter-monitor';

export class DashboardMapper {
  static toVoterMonitorDomain(entity: VoterEntity): VoterMonitor {
    return new VoterMonitor({
      id: entity.id,
      nim: entity.nim,
      namaLengkap: entity.namaLengkap,
      angkatan: entity.angkatan,
      email: entity.email,
      hasVoted: entity.hasVoted,
      votedAt: entity.votedAt,
    });
  }
}
