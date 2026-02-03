import { ExtractJwt, Strategy } from 'passport-jwt';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AdminJwtPayload } from './types/admin-jwt-payload.type';
import { AllConfigType } from '../../config/config.type';

@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, 'admin-jwt') {
  constructor(configService: ConfigService<AllConfigType>) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.getOrThrow('adminAuth.secret', {
        infer: true,
      }),
    });
  }

  public validate(payload: AdminJwtPayload): AdminJwtPayload {
    if (!payload.id || !payload.username || !payload.role) {
      throw new UnauthorizedException();
    }

    return payload;
  }
}
