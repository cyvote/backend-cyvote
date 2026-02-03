import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAuditLogsTable1770094968272 implements MigrationInterface {
  name = 'CreateAuditLogsTable1770094968272';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create audit_logs table
    await queryRunner.query(
      `CREATE TABLE "audit_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "actor_id" uuid,
        "actor_type" character varying(20),
        "action" character varying(100) NOT NULL,
        "resource_type" character varying(50),
        "resource_id" uuid,
        "ip_address" character varying(45),
        "user_agent" text,
        "status" character varying(20),
        "details" jsonb,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_audit_logs" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_audit_logs_actor_type" CHECK ("actor_type" IN ('VOTER', 'ADMIN', 'SUPERADMIN', 'SYSTEM')),
        CONSTRAINT "CHK_audit_logs_status" CHECK ("status" IN ('SUCCESS', 'FAILURE'))
      )`,
    );

    // Create indexes for performance
    await queryRunner.query(
      `CREATE INDEX "idx_audit_logs_created_at" ON "audit_logs" ("created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_audit_logs_actor" ON "audit_logs" ("actor_id", "actor_type")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes first
    await queryRunner.query(`DROP INDEX "public"."idx_audit_logs_actor"`);
    await queryRunner.query(`DROP INDEX "public"."idx_audit_logs_created_at"`);

    // Drop table
    await queryRunner.query(`DROP TABLE "audit_logs"`);
  }
}
