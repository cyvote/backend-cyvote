import { registerAs } from '@nestjs/config';
import { AuditLogConfig } from './audit-log-config.type';
import { IsBoolean, IsIn, IsString } from 'class-validator';
import validateConfig from '../../utils/validate-config';

class EnvironmentVariablesValidator {
  @IsBoolean()
  AUDIT_LOG_ENABLED: boolean;

  @IsString()
  @IsIn(['error', 'warn', 'info', 'debug'])
  AUDIT_LOG_LEVEL: string;

  @IsBoolean()
  AUDIT_LOG_CONSOLE_ENABLED: boolean;

  @IsBoolean()
  AUDIT_LOG_FILE_ENABLED: boolean;

  @IsString()
  AUDIT_LOG_FILE_PATH: string;

  @IsString()
  AUDIT_LOG_MAX_FILES: string;

  @IsString()
  AUDIT_LOG_MAX_SIZE: string;

  @IsBoolean()
  AUDIT_LOG_DATABASE_ENABLED: boolean;
}

export default registerAs<AuditLogConfig>('auditLog', () => {
  validateConfig(process.env, EnvironmentVariablesValidator);

  return {
    enabled: process.env.AUDIT_LOG_ENABLED === 'true',
    logLevel: (process.env.AUDIT_LOG_LEVEL as 'error' | 'warn' | 'info' | 'debug') || 'info',
    consoleEnabled: process.env.AUDIT_LOG_CONSOLE_ENABLED === 'true',
    fileEnabled: process.env.AUDIT_LOG_FILE_ENABLED === 'true',
    filePath: process.env.AUDIT_LOG_FILE_PATH || './logs',
    maxFiles: process.env.AUDIT_LOG_MAX_FILES || '30d',
    maxSize: process.env.AUDIT_LOG_MAX_SIZE || '20m',
    databaseEnabled: process.env.AUDIT_LOG_DATABASE_ENABLED === 'true',
  };
});
