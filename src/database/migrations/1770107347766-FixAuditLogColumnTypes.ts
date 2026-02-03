import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixAuditLogColumnTypes1770107347766 implements MigrationInterface {
  name = 'FixAuditLogColumnTypes1770107347766';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Change actorId from uuid to character varying
    await queryRunner.query(
      `ALTER TABLE "audit_log" ALTER COLUMN "actorId" TYPE character varying USING "actorId"::character varying`,
    );

    // Change resourceId from uuid to character varying
    await queryRunner.query(
      `ALTER TABLE "audit_log" ALTER COLUMN "resourceId" TYPE character varying USING "resourceId"::character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert resourceId from character varying to uuid
    await queryRunner.query(
      `ALTER TABLE "audit_log" ALTER COLUMN "resourceId" TYPE uuid USING "resourceId"::uuid`,
    );

    // Revert actorId from character varying to uuid
    await queryRunner.query(
      `ALTER TABLE "audit_log" ALTER COLUMN "actorId" TYPE uuid USING "actorId"::uuid`,
    );
  }
}
