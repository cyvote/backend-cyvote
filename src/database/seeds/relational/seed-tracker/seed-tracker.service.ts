import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { SeedHistoryEntity } from './entities/seed-history.entity';

export interface SeedInfo {
  name: string;
  filePath: string;
  checksum: string;
}

export interface PendingSeedResult {
  pending: SeedInfo[];
  executed: SeedHistoryEntity[];
  changed: SeedInfo[];
}

@Injectable()
export class SeedTrackerService {
  private readonly logger = new Logger(SeedTrackerService.name);

  constructor(
    @InjectRepository(SeedHistoryEntity)
    private readonly repository: Repository<SeedHistoryEntity>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Ensure the seed_history table exists
   */
  async ensureTableExists(): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      const tableExists = await queryRunner.hasTable('seed_history');
      if (!tableExists) {
        this.logger.log('Creating seed_history table...');
        await queryRunner.query(`
          CREATE TABLE "seed_history" (
            "id" SERIAL PRIMARY KEY,
            "name" VARCHAR NOT NULL UNIQUE,
            "checksum" VARCHAR,
            "executedAt" TIMESTAMP NOT NULL DEFAULT now()
          )
        `);
        this.logger.log('seed_history table created successfully');
      }
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Calculate checksum for a seed file
   */
  calculateChecksum(filePath: string): string {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return crypto.createHash('md5').update(content).digest('hex');
    } catch {
      return '';
    }
  }

  /**
   * Check if a seed has been executed
   */
  async isExecuted(seedName: string): Promise<boolean> {
    const record = await this.repository.findOne({
      where: { name: seedName },
    });
    return !!record;
  }

  /**
   * Check if a seed file has changed since last execution
   */
  async hasChanged(
    seedName: string,
    currentChecksum: string,
  ): Promise<boolean> {
    const record = await this.repository.findOne({
      where: { name: seedName },
    });

    if (!record) {
      return true; // Never executed, consider as "changed"
    }

    return record.checksum !== currentChecksum;
  }

  /**
   * Mark a seed as executed
   */
  async markAsExecuted(seedName: string, checksum: string): Promise<void> {
    const existing = await this.repository.findOne({
      where: { name: seedName },
    });

    if (existing) {
      existing.checksum = checksum;
      await this.repository.save(existing);
      this.logger.log(`Updated seed record: ${seedName}`);
    } else {
      await this.repository.save(
        this.repository.create({
          name: seedName,
          checksum,
        }),
      );
      this.logger.log(`Recorded seed execution: ${seedName}`);
    }
  }

  /**
   * Get all executed seeds
   */
  async getExecutedSeeds(): Promise<SeedHistoryEntity[]> {
    return this.repository.find({
      order: { executedAt: 'ASC' },
    });
  }

  /**
   * Get pending seeds that haven't been executed yet
   */
  async getPendingSeeds(seedsDir: string): Promise<PendingSeedResult> {
    const executed = await this.getExecutedSeeds();
    const executedNames = new Set(executed.map((s) => s.name));
    const executedChecksums = new Map(
      executed.map((s) => [s.name, s.checksum]),
    );

    const pending: SeedInfo[] = [];
    const changed: SeedInfo[] = [];

    // Scan seed directories
    const seedDirs = fs.readdirSync(seedsDir, { withFileTypes: true });

    for (const dir of seedDirs) {
      if (dir.isDirectory() && dir.name !== 'seed-tracker') {
        const seedServicePath = path.join(
          seedsDir,
          dir.name,
          `${dir.name}-seed.service.ts`,
        );

        if (fs.existsSync(seedServicePath)) {
          const seedName = `${dir.name}-seed`;
          const checksum = this.calculateChecksum(seedServicePath);

          if (!executedNames.has(seedName)) {
            pending.push({
              name: seedName,
              filePath: seedServicePath,
              checksum,
            });
          } else if (executedChecksums.get(seedName) !== checksum) {
            changed.push({
              name: seedName,
              filePath: seedServicePath,
              checksum,
            });
          }
        }
      }
    }

    return { pending, executed, changed };
  }

  /**
   * Show seed status (like migration:show)
   */
  async showStatus(seedsDir: string): Promise<void> {
    const { pending, executed, changed } = await this.getPendingSeeds(seedsDir);

    this.logger.log('\n=== Seed Status ===\n');

    if (executed.length > 0) {
      this.logger.log('✓ Executed seeds:');
      for (const seed of executed) {
        const isChanged = changed.some((c) => c.name === seed.name);
        const status = isChanged ? ' (CHANGED)' : '';
        this.logger.log(
          `  [X] ${seed.name} - ${seed.executedAt.toISOString()}${status}`,
        );
      }
    }

    if (pending.length > 0) {
      this.logger.log('\n⏳ Pending seeds:');
      for (const seed of pending) {
        this.logger.log(`  [ ] ${seed.name}`);
      }
    }

    if (changed.length > 0) {
      this.logger.log(
        '\n⚠️  Changed seeds (already executed but file modified):',
      );
      for (const seed of changed) {
        this.logger.log(`  [~] ${seed.name}`);
      }
    }

    if (pending.length === 0 && changed.length === 0) {
      this.logger.log('\n✅ All seeds are up to date!');
    }

    this.logger.log('');
  }
}
