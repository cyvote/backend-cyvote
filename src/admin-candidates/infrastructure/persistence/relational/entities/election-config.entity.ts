import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

/**
 * TypeORM entity for election_config table
 * Used to check election status in admin-candidates module
 *
 * Note: This is a read-only entity for status check purposes.
 * Full election config management is handled by election-schedule module.
 */
@Entity('election_config')
export class ElectionConfigEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20 })
  status: string;
}
