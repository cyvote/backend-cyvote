import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSeedHistoryTable1770400000000 implements MigrationInterface {
  name = 'CreateSeedHistoryTable1770400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "seed_history" (
        "id" SERIAL NOT NULL,
        "name" character varying NOT NULL,
        "checksum" character varying,
        "executedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_seed_history_name" UNIQUE ("name"),
        CONSTRAINT "PK_seed_history" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "seed_history"`);
  }
}
