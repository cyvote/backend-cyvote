import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTokensTable1770094948839 implements MigrationInterface {
  name = 'CreateTokensTable1770094948839';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create tokens table
    await queryRunner.query(
      `CREATE TABLE "tokens" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "voter_id" uuid,
        "token_hash" character varying(64) NOT NULL,
        "generated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "used_at" TIMESTAMP,
        "is_used" boolean NOT NULL DEFAULT false,
        "resend_count" integer NOT NULL DEFAULT 0,
        CONSTRAINT "PK_tokens" PRIMARY KEY ("id"),
        CONSTRAINT "FK_tokens_voter" FOREIGN KEY ("voter_id") REFERENCES "voters"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )`,
    );

    // Create index on voter_id for fast lookup
    await queryRunner.query(
      `CREATE INDEX "idx_tokens_voter" ON "tokens" ("voter_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index first
    await queryRunner.query(`DROP INDEX "public"."idx_tokens_voter"`);

    // Drop table
    await queryRunner.query(`DROP TABLE "tokens"`);
  }
}
