import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAdminsTable1770094922648 implements MigrationInterface {
  name = 'CreateAdminsTable1770094922648';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create admins table
    await queryRunner.query(
      `CREATE TABLE "admins" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "username" character varying(50) NOT NULL,
        "password_hash" character varying(255) NOT NULL,
        "role" character varying(20) NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "last_login" TIMESTAMP,
        CONSTRAINT "UQ_admins_username" UNIQUE ("username"),
        CONSTRAINT "PK_admins" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_admins_role" CHECK ("role" IN ('ADMIN', 'SUPERADMIN'))
      )`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop table
    await queryRunner.query(`DROP TABLE "admins"`);
  }
}
