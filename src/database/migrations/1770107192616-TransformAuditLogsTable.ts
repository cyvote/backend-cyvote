import { MigrationInterface, QueryRunner } from 'typeorm';

export class TransformAuditLogsTable1770107192616
  implements MigrationInterface
{
  name = 'TransformAuditLogsTable1770107192616';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Rename table from audit_logs to audit_log
    await queryRunner.query(`ALTER TABLE "audit_logs" RENAME TO "audit_log"`);

    // Rename columns from snake_case to camelCase
    await queryRunner.query(
      `ALTER TABLE "audit_log" RENAME COLUMN "actor_id" TO "actorId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_log" RENAME COLUMN "actor_type" TO "actorType"`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_log" RENAME COLUMN "resource_type" TO "resourceType"`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_log" RENAME COLUMN "resource_id" TO "resourceId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_log" RENAME COLUMN "ip_address" TO "ipAddress"`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_log" RENAME COLUMN "user_agent" TO "userAgent"`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_log" RENAME COLUMN "created_at" TO "createdAt"`,
    );

    // Add message column (required by entity)
    await queryRunner.query(
      `ALTER TABLE "audit_log" ADD "message" text NOT NULL DEFAULT ''`,
    );

    // Update id column from uuid to SERIAL
    await queryRunner.query(
      `ALTER TABLE "audit_log" DROP CONSTRAINT "PK_audit_logs"`,
    );
    await queryRunner.query(`ALTER TABLE "audit_log" DROP COLUMN "id"`);
    await queryRunner.query(`ALTER TABLE "audit_log" ADD "id" SERIAL NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "audit_log" ADD CONSTRAINT "PK_audit_log" PRIMARY KEY ("id")`,
    );

    // Drop old indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_audit_logs_actor"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_audit_logs_created_at"`);

    // Drop old CHECK constraints
    await queryRunner.query(
      `ALTER TABLE "audit_log" DROP CONSTRAINT IF EXISTS "CHK_audit_logs_actor_type"`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_log" DROP CONSTRAINT IF EXISTS "CHK_audit_logs_status"`,
    );

    // Create new indexes with camelCase column names
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_log_actorId" ON "audit_log" ("actorId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_log_actorType" ON "audit_log" ("actorType")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_log_action" ON "audit_log" ("action")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_log_status" ON "audit_log" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_log_createdAt" ON "audit_log" ("createdAt")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop new indexes
    await queryRunner.query(`DROP INDEX "public"."IDX_audit_log_createdAt"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_audit_log_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_audit_log_action"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_audit_log_actorType"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_audit_log_actorId"`);

    // Restore CHECK constraints
    await queryRunner.query(
      `ALTER TABLE "audit_log" ADD CONSTRAINT "CHK_audit_logs_status" CHECK ("status" IN ('SUCCESS', 'FAILURE'))`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_log" ADD CONSTRAINT "CHK_audit_logs_actor_type" CHECK ("actorType" IN ('VOTER', 'ADMIN', 'SUPERADMIN', 'SYSTEM'))`,
    );

    // Restore old indexes
    await queryRunner.query(
      `CREATE INDEX "idx_audit_logs_created_at" ON "audit_log" ("createdAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_audit_logs_actor" ON "audit_log" ("actorId", "actorType")`,
    );

    // Restore id column from SERIAL to uuid
    await queryRunner.query(
      `ALTER TABLE "audit_log" DROP CONSTRAINT "PK_audit_log"`,
    );
    await queryRunner.query(`ALTER TABLE "audit_log" DROP COLUMN "id"`);
    await queryRunner.query(
      `ALTER TABLE "audit_log" ADD "id" uuid NOT NULL DEFAULT uuid_generate_v4()`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_log" ADD CONSTRAINT "PK_audit_logs" PRIMARY KEY ("id")`,
    );

    // Remove message column
    await queryRunner.query(`ALTER TABLE "audit_log" DROP COLUMN "message"`);

    // Rename columns from camelCase to snake_case
    await queryRunner.query(
      `ALTER TABLE "audit_log" RENAME COLUMN "createdAt" TO "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_log" RENAME COLUMN "userAgent" TO "user_agent"`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_log" RENAME COLUMN "ipAddress" TO "ip_address"`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_log" RENAME COLUMN "resourceId" TO "resource_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_log" RENAME COLUMN "resourceType" TO "resource_type"`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_log" RENAME COLUMN "actorType" TO "actor_type"`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_log" RENAME COLUMN "actorId" TO "actor_id"`,
    );

    // Rename table from audit_log to audit_logs
    await queryRunner.query(`ALTER TABLE "audit_log" RENAME TO "audit_logs"`);
  }
}
