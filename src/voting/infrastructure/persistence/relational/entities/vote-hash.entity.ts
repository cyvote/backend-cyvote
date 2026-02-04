import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { VoteEntity } from './vote.entity';

@Entity('vote_hashes')
export class VoteHashEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'vote_id', type: 'uuid', nullable: true })
  voteId: string;

  @Column({ type: 'varchar', length: 64 })
  hash: string;

  @Column({
    name: 'verification_hash',
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  verificationHash: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => VoteEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vote_id' })
  vote?: VoteEntity;
}
