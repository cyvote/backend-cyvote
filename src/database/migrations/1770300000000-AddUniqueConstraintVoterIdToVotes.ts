import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUniqueConstraintVoterIdToVotes1770300000000
  implements MigrationInterface
{
  name = 'AddUniqueConstraintVoterIdToVotes1770300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add UNIQUE constraint on voter_id to prevent double voting at DB level
    await queryRunner.query(
      `ALTER TABLE "votes" ADD CONSTRAINT "UQ_votes_voter_id" UNIQUE ("voter_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove UNIQUE constraint
    await queryRunner.query(
      `ALTER TABLE "votes" DROP CONSTRAINT "UQ_votes_voter_id"`,
    );
  }
}
