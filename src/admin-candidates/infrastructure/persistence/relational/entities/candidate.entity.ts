import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Candidate } from '../../../../domain/candidate';
import { CandidateStatus } from '../../../../enums/candidate-status.enum';

/**
 * TypeORM entity for candidates table
 */
@Entity('candidates')
export class CandidateEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  nama: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: CandidateStatus.ACTIVE,
  })
  status: string;

  @Column({ name: 'photo_url', type: 'varchar', length: 500, nullable: true })
  photoUrl: string | null;

  @Column({ name: 'visi_misi', type: 'text', nullable: true })
  visiMisi: string | null;

  @Column({ name: 'program_kerja', type: 'text', nullable: true })
  programKerja: string | null;

  @Column({
    name: 'grand_design_url',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  grandDesignUrl: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  /**
   * Map entity to domain model
   */
  toDomain(): Candidate {
    const candidate = new Candidate();
    candidate.id = this.id;
    candidate.nama = this.nama;
    candidate.status = this.status as CandidateStatus;
    candidate.photoUrl = this.photoUrl;
    candidate.visiMisi = this.visiMisi;
    candidate.programKerja = this.programKerja;
    candidate.grandDesignUrl = this.grandDesignUrl;
    candidate.createdAt = this.createdAt;
    candidate.updatedAt = this.updatedAt;
    return candidate;
  }

  /**
   * Create entity from domain model
   */
  static fromDomain(candidate: Candidate): CandidateEntity {
    const entity = new CandidateEntity();
    entity.id = candidate.id;
    entity.nama = candidate.nama;
    entity.status = candidate.status;
    entity.photoUrl = candidate.photoUrl;
    entity.visiMisi = candidate.visiMisi;
    entity.programKerja = candidate.programKerja;
    entity.grandDesignUrl = candidate.grandDesignUrl;
    entity.createdAt = candidate.createdAt;
    entity.updatedAt = candidate.updatedAt;
    return entity;
  }
}
