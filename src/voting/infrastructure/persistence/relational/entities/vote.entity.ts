import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { VoterEntity } from '../../../../../admin-voters/infrastructure/persistence/relational/entities/voter.entity';
import { CandidateEntity } from '../../../../../admin-candidates/infrastructure/persistence/relational/entities/candidate.entity';

@Entity('votes')
export class VoteEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'voter_id', type: 'uuid', nullable: true })
  voterId: string;

  @Column({ name: 'candidate_id', type: 'uuid', nullable: true })
  candidateId: string;

  @Column({ name: 'vote_hash', type: 'varchar', length: 64 })
  voteHash: string;

  @Column({ name: 'voted_at', type: 'timestamp', default: () => 'now()' })
  votedAt: Date;

  @Column({ name: 'receipt_code', type: 'varchar', length: 20 })
  receiptCode: string;

  @ManyToOne(() => VoterEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'voter_id' })
  voter?: VoterEntity;

  @ManyToOne(() => CandidateEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'candidate_id' })
  candidate?: CandidateEntity;
}
