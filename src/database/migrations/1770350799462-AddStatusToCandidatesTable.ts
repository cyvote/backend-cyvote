import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStatusToCandidatesTable1770350799462
  implements MigrationInterface
{
  name = 'AddStatusToCandidatesTable1770350799462';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add status column with default 'active' so existing rows are automatically active
    await queryRunner.query(
      `ALTER TABLE "candidates" ADD "status" character varying(20) NOT NULL DEFAULT 'active'`,
    );

    // Add CHECK constraint to ensure only valid status values
    await queryRunner.query(
      `ALTER TABLE "candidates" ADD CONSTRAINT "CHK_candidates_status" CHECK ("status" IN ('active', 'inactive'))`,
    );

    // Create index on status for fast filtering on public endpoint
    await queryRunner.query(
      `CREATE INDEX "idx_candidates_status" ON "candidates" ("status")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index first
    await queryRunner.query(`DROP INDEX "public"."idx_candidates_status"`);

    // Drop CHECK constraint
    await queryRunner.query(
      `ALTER TABLE "candidates" DROP CONSTRAINT "CHK_candidates_status"`,
    );

    // Drop status column
    await queryRunner.query(
      `ALTER TABLE "candidates" DROP COLUMN "status"`,
    );
  }
}
