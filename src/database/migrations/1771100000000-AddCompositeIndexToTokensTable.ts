import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCompositeIndexToTokensTable1771100000000
  implements MigrationInterface
{
  name = 'AddCompositeIndexToTokensTable1771100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create composite index on tokens table for efficient LEFT JOIN queries
    // Covers: voter_id lookup + is_used filter + generated_at ordering
    await queryRunner.query(
      `CREATE INDEX "idx_tokens_voter_status_date" ON "tokens" ("voter_id", "is_used", "generated_at" DESC)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the composite index
    await queryRunner.query(
      `DROP INDEX "public"."idx_tokens_voter_status_date"`,
    );
  }
}
