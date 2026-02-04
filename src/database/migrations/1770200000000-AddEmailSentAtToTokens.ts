import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEmailSentAtToTokens1770200000000 implements MigrationInterface {
  name = 'AddEmailSentAtToTokens1770200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add email_sent_at column to tokens table
    await queryRunner.query(
      `ALTER TABLE "tokens" ADD COLUMN "email_sent_at" TIMESTAMP`,
    );

    // Create index for finding tokens not yet sent
    await queryRunner.query(
      `CREATE INDEX "idx_tokens_email_sent_at" ON "tokens" ("email_sent_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index first
    await queryRunner.query(`DROP INDEX "public"."idx_tokens_email_sent_at"`);

    // Drop column
    await queryRunner.query(`ALTER TABLE "tokens" DROP COLUMN "email_sent_at"`);
  }
}
