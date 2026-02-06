import { registerAs } from '@nestjs/config';
import { SecurityConfig } from './security-config.type';
import validateConfig from '../../utils/validate-config';
import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

class EnvironmentVariablesValidator {
  @IsInt()
  @Min(1)
  @IsOptional()
  SECURITY_RATE_LIMIT_GLOBAL_TTL: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  SECURITY_RATE_LIMIT_GLOBAL_LIMIT: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  SECURITY_RATE_LIMIT_LOGIN_TTL: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  SECURITY_RATE_LIMIT_LOGIN_LIMIT: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  SECURITY_RATE_LIMIT_TOKEN_VERIFY_TTL: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  SECURITY_RATE_LIMIT_TOKEN_VERIFY_LIMIT: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  SECURITY_RATE_LIMIT_SUPERADMIN_AUDIT_LOGS_TTL: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  SECURITY_RATE_LIMIT_SUPERADMIN_AUDIT_LOGS_LIMIT: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  SECURITY_RATE_LIMIT_ELECTION_RESULTS_TTL: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  SECURITY_RATE_LIMIT_ELECTION_RESULTS_LIMIT: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  SECURITY_RATE_LIMIT_PUBLIC_RESULTS_TTL: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  SECURITY_RATE_LIMIT_PUBLIC_RESULTS_LIMIT: number;

  @IsInt()
  @Min(1000)
  @IsOptional()
  SECURITY_RATE_LIMIT_CLEANUP_INTERVAL: number;

  @IsBoolean()
  @IsOptional()
  SECURITY_HELMET_ENABLED: boolean;

  @IsBoolean()
  @IsOptional()
  SECURITY_CSRF_ENABLED: boolean;

  @IsString()
  @IsOptional()
  SECURITY_CSRF_SECRET: string;

  @IsString()
  @IsOptional()
  SECURITY_CSRF_COOKIE_NAME: string;

  @IsString()
  @IsOptional()
  SECURITY_CSRF_HEADER_NAME: string;

  @IsInt()
  @Min(60)
  @IsOptional()
  SECURITY_CSRF_TTL: number;

  @IsBoolean()
  @IsOptional()
  SECURITY_IP_TRUST_PROXY: boolean;

  @IsString()
  @IsOptional()
  SECURITY_IP_PROXY_HEADERS: string;
}

export default registerAs<SecurityConfig>('security', () => {
  validateConfig(process.env, EnvironmentVariablesValidator);

  const proxyHeadersEnv =
    process.env.SECURITY_IP_PROXY_HEADERS || 'x-forwarded-for,x-real-ip';
  const proxyHeaders = proxyHeadersEnv.split(',').map((h) => h.trim());

  return {
    rateLimit: {
      global: {
        ttl: process.env.SECURITY_RATE_LIMIT_GLOBAL_TTL
          ? parseInt(process.env.SECURITY_RATE_LIMIT_GLOBAL_TTL, 10)
          : 60,
        limit: process.env.SECURITY_RATE_LIMIT_GLOBAL_LIMIT
          ? parseInt(process.env.SECURITY_RATE_LIMIT_GLOBAL_LIMIT, 10)
          : 100,
      },
      login: {
        ttl: process.env.SECURITY_RATE_LIMIT_LOGIN_TTL
          ? parseInt(process.env.SECURITY_RATE_LIMIT_LOGIN_TTL, 10)
          : 600,
        limit: process.env.SECURITY_RATE_LIMIT_LOGIN_LIMIT
          ? parseInt(process.env.SECURITY_RATE_LIMIT_LOGIN_LIMIT, 10)
          : 5,
      },
      tokenVerify: {
        ttl: process.env.SECURITY_RATE_LIMIT_TOKEN_VERIFY_TTL
          ? parseInt(process.env.SECURITY_RATE_LIMIT_TOKEN_VERIFY_TTL, 10)
          : 300,
        limit: process.env.SECURITY_RATE_LIMIT_TOKEN_VERIFY_LIMIT
          ? parseInt(process.env.SECURITY_RATE_LIMIT_TOKEN_VERIFY_LIMIT, 10)
          : 3,
      },
      superadminAuditLogs: {
        ttl: process.env.SECURITY_RATE_LIMIT_SUPERADMIN_AUDIT_LOGS_TTL
          ? parseInt(
              process.env.SECURITY_RATE_LIMIT_SUPERADMIN_AUDIT_LOGS_TTL,
              10,
            )
          : 60,
        limit: process.env.SECURITY_RATE_LIMIT_SUPERADMIN_AUDIT_LOGS_LIMIT
          ? parseInt(
              process.env.SECURITY_RATE_LIMIT_SUPERADMIN_AUDIT_LOGS_LIMIT,
              10,
            )
          : 30,
      },
      electionResults: {
        ttl: process.env.SECURITY_RATE_LIMIT_ELECTION_RESULTS_TTL
          ? parseInt(process.env.SECURITY_RATE_LIMIT_ELECTION_RESULTS_TTL, 10)
          : 60,
        limit: process.env.SECURITY_RATE_LIMIT_ELECTION_RESULTS_LIMIT
          ? parseInt(process.env.SECURITY_RATE_LIMIT_ELECTION_RESULTS_LIMIT, 10)
          : 10,
      },
      publicResults: {
        ttl: process.env.SECURITY_RATE_LIMIT_PUBLIC_RESULTS_TTL
          ? parseInt(process.env.SECURITY_RATE_LIMIT_PUBLIC_RESULTS_TTL, 10)
          : 60,
        limit: process.env.SECURITY_RATE_LIMIT_PUBLIC_RESULTS_LIMIT
          ? parseInt(process.env.SECURITY_RATE_LIMIT_PUBLIC_RESULTS_LIMIT, 10)
          : 30,
      },
      storage: {
        cleanupInterval: process.env.SECURITY_RATE_LIMIT_CLEANUP_INTERVAL
          ? parseInt(process.env.SECURITY_RATE_LIMIT_CLEANUP_INTERVAL, 10)
          : 60000,
      },
    },
    helmet: {
      enabled: process.env.SECURITY_HELMET_ENABLED === 'false' ? false : true,
      contentSecurityPolicy: true,
      crossOriginEmbedderPolicy: true,
      crossOriginOpenerPolicy: true,
      crossOriginResourcePolicy: true,
      dnsPrefetchControl: true,
      frameguard: true,
      hidePoweredBy: true,
      hsts: true,
      ieNoOpen: true,
      noSniff: true,
      originAgentCluster: true,
      permittedCrossDomainPolicies: true,
      referrerPolicy: true,
      xssFilter: true,
    },
    csrf: {
      enabled: process.env.SECURITY_CSRF_ENABLED === 'false' ? false : true,
      cookieName: process.env.SECURITY_CSRF_COOKIE_NAME || 'csrf-token',
      headerName: process.env.SECURITY_CSRF_HEADER_NAME || 'x-csrf-token',
      secret:
        process.env.SECURITY_CSRF_SECRET ||
        'change-me-to-a-secure-random-secret-minimum-32-characters',
      ttl: process.env.SECURITY_CSRF_TTL
        ? parseInt(process.env.SECURITY_CSRF_TTL, 10)
        : 3600,
    },
    ipExtraction: {
      trustProxy:
        process.env.SECURITY_IP_TRUST_PROXY === 'false' ? false : true,
      proxyHeaders: proxyHeaders,
    },
  };
});
