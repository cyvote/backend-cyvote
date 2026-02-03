import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  ElectionConfig,
  ElectionStatus,
} from '../../../../domain/election-config.model';

@Entity('election_config')
export class ElectionConfigEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'start_date', type: 'timestamp' })
  startDate: Date;

  @Column({ name: 'end_date', type: 'timestamp' })
  endDate: Date;

  @Column({ type: 'varchar', length: 20, default: 'SCHEDULED' })
  status: string;

  @Column({ name: 'results_published_at', type: 'timestamp', nullable: true })
  resultsPublishedAt: Date | null;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  /**
   * Convert entity to domain model
   */
  toDomain(): ElectionConfig {
    return new ElectionConfig({
      id: this.id,
      startDate: this.startDate,
      endDate: this.endDate,
      status: this.status as ElectionStatus,
      resultsPublishedAt: this.resultsPublishedAt,
      createdBy: this.createdBy,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    });
  }
}
