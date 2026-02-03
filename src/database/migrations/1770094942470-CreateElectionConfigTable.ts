import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateElectionConfigTable1770094942470
  implements MigrationInterface
{
  name = 'CreateElectionConfigTable1770094942470';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create election_config table
    await queryRunner.query(
      `CREATE TABLE "election_config" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "start_date" TIMESTAMP NOT NULL,
        "end_date" TIMESTAMP NOT NULL,
        "status" character varying(20) NOT NULL DEFAULT 'SCHEDULED',
        "results_published_at" TIMESTAMP,
        "created_by" uuid,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_election_config" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_election_config_status" CHECK ("status" IN ('SCHEDULED', 'ACTIVE', 'CLOSED', 'PUBLISHED')),
        CONSTRAINT "FK_election_config_created_by" FOREIGN KEY ("created_by") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE NO ACTION
      )`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop table
    await queryRunner.query(`DROP TABLE "election_config"`);
  }
}
