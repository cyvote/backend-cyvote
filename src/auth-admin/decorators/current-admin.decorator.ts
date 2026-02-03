import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AdminJwtPayload } from '../strategies/types/admin-jwt-payload.type';

export const CurrentAdmin = createParamDecorator(
  (data: keyof AdminJwtPayload | undefined, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest();
    const user = request.user as AdminJwtPayload;

    if (!user) {
      return null;
    }

    return data ? user[data] : user;
  },
);
