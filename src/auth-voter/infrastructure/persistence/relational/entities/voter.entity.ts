import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';
import { Voter } from '../../../../domain/voter.model';

@Entity('voters')
export class VoterEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 15, unique: true })
  @Index('idx_voters_nim')
  nim: string;

  @Column({ name: 'nama_lengkap', type: 'varchar', length: 100 })
  namaLengkap: string;

  @Column({ type: 'int' })
  angkatan: number;

  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ name: 'has_voted', type: 'boolean', default: false })
  @Index('idx_voters_has_voted')
  hasVoted: boolean;

  @Column({ name: 'voted_at', type: 'timestamp', nullable: true })
  votedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null;

  /**
   * Convert entity to domain model
   */
  toDomain(): Voter {
    return new Voter({
      id: this.id,
      nim: this.nim,
      namaLengkap: this.namaLengkap,
      angkatan: this.angkatan,
      email: this.email,
      hasVoted: this.hasVoted,
      votedAt: this.votedAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      deletedAt: this.deletedAt,
    });
  }
}
