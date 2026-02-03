import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCandidatesTable1770094899714 implements MigrationInterface {
  name = 'CreateCandidatesTable1770094899714';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create candidates table
    await queryRunner.query(
      `CREATE TABLE "candidates" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "nama" character varying(100) NOT NULL,
        "photo_url" character varying(500),
        "visi_misi" text,
        "program_kerja" text,
        "grand_design_url" character varying(500),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_candidates" PRIMARY KEY ("id")
      )`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop table
    await queryRunner.query(`DROP TABLE "candidates"`);
  }
}
