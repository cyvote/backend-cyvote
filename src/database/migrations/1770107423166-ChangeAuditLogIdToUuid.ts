import { MigrationInterface, QueryRunner } from 'typeorm';

export class ChangeAuditLogIdToUuid1770107423166 implements MigrationInterface {
  name = 'ChangeAuditLogIdToUuid1770107423166';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop primary key constraint
    await queryRunner.query(
      `ALTER TABLE "audit_log" DROP CONSTRAINT "PK_audit_log"`,
    );

    // Drop the existing id column
    await queryRunner.query(`ALTER TABLE "audit_log" DROP COLUMN "id"`);

    // Add new id column as UUID with default
    await queryRunner.query(
      `ALTER TABLE "audit_log" ADD "id" uuid NOT NULL DEFAULT uuid_generate_v4()`,
    );

    // Add primary key constraint back
    await queryRunner.query(
      `ALTER TABLE "audit_log" ADD CONSTRAINT "PK_audit_log" PRIMARY KEY ("id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop primary key constraint
    await queryRunner.query(
      `ALTER TABLE "audit_log" DROP CONSTRAINT "PK_audit_log"`,
    );

    // Drop the UUID id column
    await queryRunner.query(`ALTER TABLE "audit_log" DROP COLUMN "id"`);

    // Add back SERIAL id column
    await queryRunner.query(`ALTER TABLE "audit_log" ADD "id" SERIAL NOT NULL`);

    // Add primary key constraint back
    await queryRunner.query(
      `ALTER TABLE "audit_log" ADD CONSTRAINT "PK_audit_log" PRIMARY KEY ("id")`,
    );
  }
}
