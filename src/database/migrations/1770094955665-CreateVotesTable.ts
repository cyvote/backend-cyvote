import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateVotesTable1770094955665 implements MigrationInterface {
  name = 'CreateVotesTable1770094955665';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create votes table
    await queryRunner.query(
      `CREATE TABLE "votes" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "voter_id" uuid,
        "candidate_id" uuid,
        "vote_hash" character varying(64) NOT NULL,
        "voted_at" TIMESTAMP NOT NULL DEFAULT now(),
        "receipt_code" character varying(20) NOT NULL,
        CONSTRAINT "UQ_votes_receipt_code" UNIQUE ("receipt_code"),
        CONSTRAINT "PK_votes" PRIMARY KEY ("id"),
        CONSTRAINT "FK_votes_voter" FOREIGN KEY ("voter_id") REFERENCES "voters"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "FK_votes_candidate" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
      )`,
    );

    // Create indexes for performance
    await queryRunner.query(
      `CREATE INDEX "idx_votes_voter" ON "votes" ("voter_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_votes_candidate" ON "votes" ("candidate_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes first
    await queryRunner.query(`DROP INDEX "public"."idx_votes_candidate"`);
    await queryRunner.query(`DROP INDEX "public"."idx_votes_voter"`);

    // Drop table
    await queryRunner.query(`DROP TABLE "votes"`);
  }
}
