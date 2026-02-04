import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AllConfigType } from '../../../config/config.type';

export interface HelmetOptions {
  contentSecurityPolicy?: any;
  crossOriginEmbedderPolicy?: any;
  crossOriginOpenerPolicy?: any;
  crossOriginResourcePolicy?: any;
  dnsPrefetchControl?: any;
  frameguard?: any;
  hidePoweredBy?: boolean;
  hsts?: any;
  ieNoOpen?: boolean;
  noSniff?: boolean;
  originAgentCluster?: boolean;
  permittedCrossDomainPolicies?: any;
  referrerPolicy?: any;
  xssFilter?: boolean;
}

@Injectable()
export class HelmetOptionsFactory {
  constructor(private readonly configService: ConfigService<AllConfigType>) {}

  createHelmetOptions(): HelmetOptions | null {
    const helmetConfig = this.configService.get('security.helmet', {
      infer: true,
    });

    if (!helmetConfig?.enabled) {
      return null;
    }

    return {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: helmetConfig.crossOriginEmbedderPolicy,
      crossOriginOpenerPolicy: helmetConfig.crossOriginOpenerPolicy
        ? { policy: 'same-origin' }
        : false,
      crossOriginResourcePolicy: helmetConfig.crossOriginResourcePolicy
        ? { policy: 'cross-origin' }
        : false,
      dnsPrefetchControl: helmetConfig.dnsPrefetchControl
        ? { allow: false }
        : false,
      frameguard: helmetConfig.frameguard ? { action: 'deny' } : false,
      hidePoweredBy: helmetConfig.hidePoweredBy,
      hsts: helmetConfig.hsts
        ? {
            maxAge: 31536000, // 1 year in seconds
            includeSubDomains: true,
            preload: true,
          }
        : false,
      ieNoOpen: helmetConfig.ieNoOpen,
      noSniff: helmetConfig.noSniff,
      originAgentCluster: helmetConfig.originAgentCluster,
      permittedCrossDomainPolicies: helmetConfig.permittedCrossDomainPolicies
        ? { permittedPolicies: 'none' }
        : false,
      referrerPolicy: helmetConfig.referrerPolicy
        ? { policy: 'strict-origin-when-cross-origin' }
        : false,
      xssFilter: helmetConfig.xssFilter,
    };
  }
}
