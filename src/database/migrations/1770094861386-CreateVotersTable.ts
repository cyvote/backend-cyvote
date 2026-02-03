import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateVotersTable1770094861386 implements MigrationInterface {
  name = 'CreateVotersTable1770094861386';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create voters table
    await queryRunner.query(
      `CREATE TABLE "voters" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "nim" character varying(15) NOT NULL,
        "nama_lengkap" character varying(100) NOT NULL,
        "angkatan" integer NOT NULL,
        "email" character varying(255) NOT NULL,
        "has_voted" boolean NOT NULL DEFAULT false,
        "voted_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        CONSTRAINT "UQ_voters_nim" UNIQUE ("nim"),
        CONSTRAINT "PK_voters" PRIMARY KEY ("id")
      )`,
    );

    // Create index on nim for fast lookup
    await queryRunner.query(
      `CREATE INDEX "idx_voters_nim" ON "voters" ("nim")`,
    );

    // Create index on has_voted for filtering
    await queryRunner.query(
      `CREATE INDEX "idx_voters_has_voted" ON "voters" ("has_voted")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes first
    await queryRunner.query(`DROP INDEX "public"."idx_voters_has_voted"`);
    await queryRunner.query(`DROP INDEX "public"."idx_voters_nim"`);

    // Drop table
    await queryRunner.query(`DROP TABLE "voters"`);
  }
}
