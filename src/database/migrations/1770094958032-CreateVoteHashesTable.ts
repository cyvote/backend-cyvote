import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateVoteHashesTable1770094958032 implements MigrationInterface {
  name = 'CreateVoteHashesTable1770094958032';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create vote_hashes table
    await queryRunner.query(
      `CREATE TABLE "vote_hashes" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "vote_id" uuid,
        "hash" character varying(64) NOT NULL,
        "verification_hash" character varying(64),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_vote_hashes" PRIMARY KEY ("id"),
        CONSTRAINT "FK_vote_hashes_vote" FOREIGN KEY ("vote_id") REFERENCES "votes"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop table
    await queryRunner.query(`DROP TABLE "vote_hashes"`);
  }
}
