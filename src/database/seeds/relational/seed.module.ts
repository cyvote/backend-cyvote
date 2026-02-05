import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DataSource, DataSourceOptions } from 'typeorm';
import { TypeOrmConfigService } from '../../typeorm-config.service';
import { RoleSeedModule } from './role/role-seed.module';
import { StatusSeedModule } from './status/status-seed.module';
import { UserSeedModule } from './user/user-seed.module';
import { AdminSeedModule } from './admin/admin-seed.module';
import { VoterSeedModule } from './voter/voter-seed.module';
import { SeedTrackerModule } from './seed-tracker/seed-tracker.module';
import databaseConfig from '../../config/database.config';
import appConfig from '../../../config/app.config';

@Module({
  imports: [
    SeedTrackerModule,
    RoleSeedModule,
    StatusSeedModule,
    UserSeedModule,
    AdminSeedModule,
    VoterSeedModule,
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, appConfig],
      envFilePath: ['.env'],
    }),
    TypeOrmModule.forRootAsync({
      useClass: TypeOrmConfigService,
      dataSourceFactory: async (options: DataSourceOptions) => {
        return new DataSource(options).initialize();
      },
    }),
  ],
})
export class SeedModule {}
