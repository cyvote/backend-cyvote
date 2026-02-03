import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Token } from '../../../../domain/token.model';
import { VoterEntity } from './voter.entity';

@Entity('tokens')
export class TokenEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'voter_id', type: 'uuid', nullable: true })
  @Index('idx_tokens_voter')
  voterId: string | null;

  @Column({ name: 'token_hash', type: 'varchar', length: 64 })
  tokenHash: string;

  @Column({ name: 'generated_at', type: 'timestamp', default: () => 'now()' })
  generatedAt: Date;

  @Column({ name: 'used_at', type: 'timestamp', nullable: true })
  usedAt: Date | null;

  @Column({ name: 'is_used', type: 'boolean', default: false })
  isUsed: boolean;

  @Column({ name: 'resend_count', type: 'int', default: 0 })
  resendCount: number;

  @ManyToOne(() => VoterEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'voter_id' })
  voter?: VoterEntity;

  /**
   * Convert entity to domain model
   */
  toDomain(): Token {
    return new Token({
      id: this.id,
      voterId: this.voterId,
      tokenHash: this.tokenHash,
      generatedAt: this.generatedAt,
      usedAt: this.usedAt,
      isUsed: this.isUsed,
      resendCount: this.resendCount,
    });
  }
}
