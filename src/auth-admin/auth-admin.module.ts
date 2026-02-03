import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule } from '@nestjs/config';
import { AuthAdminController } from './auth-admin.controller';
import { AuthAdminService } from './auth-admin.service';
import { AdminJwtStrategy } from './strategies/admin-jwt.strategy';
import { RelationalAdminPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';
import { DocumentAdminPersistenceModule } from './infrastructure/persistence/document/document-persistence.module';
import databaseConfig from '../database/config/database.config';
import { DatabaseConfig } from '../database/config/database-config.type';
import adminAuthConfig from './config/admin-auth.config';

// <database-block>
const infrastructurePersistenceModule = (databaseConfig() as DatabaseConfig)
  .isDocumentDatabase
  ? DocumentAdminPersistenceModule
  : RelationalAdminPersistenceModule;
// </database-block>

@Module({
  imports: [
    ConfigModule.forFeature(adminAuthConfig),
    PassportModule,
    JwtModule.register({}),
    infrastructurePersistenceModule,
  ],
  controllers: [AuthAdminController],
  providers: [AuthAdminService, AdminJwtStrategy],
  exports: [AuthAdminService],
})
export class AuthAdminModule {}
