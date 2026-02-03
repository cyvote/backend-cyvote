import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'voters' })
export class VoterEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('idx_voters_nim')
  @Column({ type: 'varchar', length: 15, unique: true })
  nim: string;

  @Column({ name: 'nama_lengkap', type: 'varchar', length: 100 })
  namaLengkap: string;

  @Column({ type: 'int' })
  angkatan: number;

  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Index('idx_voters_has_voted')
  @Column({ name: 'has_voted', type: 'boolean', default: false })
  hasVoted: boolean;

  @Column({ name: 'voted_at', type: 'timestamp', nullable: true })
  votedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null;
}
