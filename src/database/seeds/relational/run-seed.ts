import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import * as path from 'node:path';
import { RoleSeedService } from './role/role-seed.service';
import { SeedModule } from './seed.module';
import { StatusSeedService } from './status/status-seed.service';
import { UserSeedService } from './user/user-seed.service';
import { AdminSeedService } from './admin/admin-seed.service';
import { VoterSeedService } from './voter/voter-seed.service';
import { SeedTrackerService } from './seed-tracker/seed-tracker.service';

interface SeedServiceConfig {
  name: string;
  service: new (...args: unknown[]) => { run(): Promise<void> };
  filePath: string;
}

const runSeed = async () => {
  const logger = new Logger('SeedRunner');
  const app = await NestFactory.create(SeedModule);
  const seedTracker = app.get(SeedTrackerService);

  // Ensure seed_history table exists
  await seedTracker.ensureTableExists();

  // Parse command line arguments
  const args = new Set(process.argv.slice(2));
  const showStatus = args.has('--status') || args.has('-s');
  const forceRun = args.has('--force') || args.has('-f');
  const runChanged = args.has('--changed') || args.has('-c');

  const seedsDir = __dirname;

  // If --status flag is passed, just show status and exit
  if (showStatus) {
    await seedTracker.showStatus(seedsDir);
    await app.close();
    return;
  }

  // Define seed services with their file paths for checksum calculation
  const seedServices: SeedServiceConfig[] = [
    {
      name: 'role-seed',
      service: RoleSeedService,
      filePath: path.join(seedsDir, 'role', 'role-seed.service.ts'),
    },
    {
      name: 'status-seed',
      service: StatusSeedService,
      filePath: path.join(seedsDir, 'status', 'status-seed.service.ts'),
    },
    {
      name: 'user-seed',
      service: UserSeedService,
      filePath: path.join(seedsDir, 'user', 'user-seed.service.ts'),
    },
    {
      name: 'admin-seed',
      service: AdminSeedService,
      filePath: path.join(seedsDir, 'admin', 'admin-seed.service.ts'),
    },
    {
      name: 'voter-seed',
      service: VoterSeedService,
      filePath: path.join(seedsDir, 'voter', 'voter-seed.service.ts'),
    },
  ];

  let executedCount = 0;
  let skippedCount = 0;

  for (const seedConfig of seedServices) {
    const checksum = seedTracker.calculateChecksum(seedConfig.filePath);
    const isExecuted = await seedTracker.isExecuted(seedConfig.name);
    const hasChanged = await seedTracker.hasChanged(seedConfig.name, checksum);

    // Determine if we should run this seed
    // Run if: forced, never executed, or (changed flag + file changed)
    const shouldRun = forceRun || !isExecuted || (runChanged && hasChanged);

    if (shouldRun) {
      logger.log(`Running seed: ${seedConfig.name}...`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await app.get(seedConfig.service as any).run();
      await seedTracker.markAsExecuted(seedConfig.name, checksum);
      executedCount++;
    } else {
      logger.log(`Skipping seed: ${seedConfig.name} (already executed)`);
      skippedCount++;
    }
  }

  logger.log(`\n=== Seed Summary ===`);
  logger.log(`Executed: ${executedCount}`);
  logger.log(`Skipped: ${skippedCount}`);
  logger.log(`Total: ${seedServices.length}`);

  await app.close();
};

void runSeed();
