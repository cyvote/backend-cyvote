import { Module } from '@nestjs/common';
import { UsersModule } from './users/users.module';
import { FilesModule } from './files/files.module';
import { AuthModule } from './auth/auth.module';
import databaseConfig from './database/config/database.config';
import authConfig from './auth/config/auth.config';
import appConfig from './config/app.config';
import mailConfig from './mail/config/mail.config';
import fileConfig from './files/config/file.config';
import facebookConfig from './auth-facebook/config/facebook.config';
import googleConfig from './auth-google/config/google.config';
import appleConfig from './auth-apple/config/apple.config';
import auditLogConfig from './audit-log/config/audit-log.config';
import path from 'path';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthAppleModule } from './auth-apple/auth-apple.module';
import { AuthFacebookModule } from './auth-facebook/auth-facebook.module';
import { AuthGoogleModule } from './auth-google/auth-google.module';
import { HeaderResolver, I18nModule } from 'nestjs-i18n';
import { TypeOrmConfigService } from './database/typeorm-config.service';
import { MailModule } from './mail/mail.module';
import { HomeModule } from './home/home.module';
import { DataSource, DataSourceOptions } from 'typeorm';
import { AllConfigType } from './config/config.type';
import { SessionModule } from './session/session.module';
import { MailerModule } from './mailer/mailer.module';
import { MongooseModule } from '@nestjs/mongoose';
import { MongooseConfigService } from './database/mongoose-config.service';
import { DatabaseConfig } from './database/config/database-config.type';
import { AuditLogModule } from './audit-log/audit-log.module';
import { AuthAdminModule } from './auth-admin/auth-admin.module';
import { AuthVoterModule } from './auth-voter/auth-voter.module';
import { AdminVotersModule } from './admin-voters/admin-voters.module';
import { AdminCandidatesModule } from './admin-candidates/admin-candidates.module';
import { AdminDashboardModule } from './admin-dashboard/admin-dashboard.module';
import { ElectionScheduleModule } from './election-schedule/election-schedule.module';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { AuditLogContextInterceptor } from './audit-log/interceptors/audit-log-context.interceptor';
import { SecurityModule } from './security/security.module';
import { GlobalRateLimitGuard } from './security/rate-limit/guards/global-rate-limit.guard';
import securityConfig from './security/config/security.config';
import { VotingTokenModule } from './voting-token/voting-token.module';
import { VotingModule } from './voting/voting.module';

// <database-block>
const infrastructureDatabaseModule = (databaseConfig() as DatabaseConfig)
  .isDocumentDatabase
  ? MongooseModule.forRootAsync({
      useClass: MongooseConfigService,
    })
  : TypeOrmModule.forRootAsync({
      useClass: TypeOrmConfigService,
      dataSourceFactory: async (options: DataSourceOptions) => {
        return new DataSource(options).initialize();
      },
    });
// </database-block>

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        databaseConfig,
        authConfig,
        appConfig,
        mailConfig,
        fileConfig,
        facebookConfig,
        googleConfig,
        appleConfig,
        auditLogConfig,
        securityConfig,
      ],
      envFilePath: ['.env'],
    }),
    ScheduleModule.forRoot({}),
    infrastructureDatabaseModule,
    I18nModule.forRootAsync({
      useFactory: (configService: ConfigService<AllConfigType>) => ({
        fallbackLanguage: configService.getOrThrow('app.fallbackLanguage', {
          infer: true,
        }),
        loaderOptions: { path: path.join(__dirname, '/i18n/'), watch: true },
      }),
      resolvers: [
        {
          use: HeaderResolver,
          useFactory: (configService: ConfigService<AllConfigType>) => {
            return [
              configService.get('app.headerLanguage', {
                infer: true,
              }),
            ];
          },
          inject: [ConfigService],
        },
      ],
      imports: [ConfigModule],
      inject: [ConfigService],
    }),
    SecurityModule,
    AuditLogModule,
    UsersModule,
    FilesModule,
    AuthModule,
    AuthFacebookModule,
    AuthGoogleModule,
    AuthAppleModule,
    SessionModule,
    MailModule,
    MailerModule,
    HomeModule,
    AuthAdminModule,
    AuthVoterModule,
    AdminVotersModule,
    AdminCandidatesModule,
    AdminDashboardModule,
    ElectionScheduleModule,
    VotingTokenModule,
    VotingModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditLogContextInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: GlobalRateLimitGuard,
    },
  ],
})
export class AppModule {}
