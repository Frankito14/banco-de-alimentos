import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { OidcJwtPayload } from '../interfaces/oidc-payload.interface';

export const CurrentUser = createParamDecorator(
  (data: keyof OidcJwtPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as OidcJwtPayload;
    return data ? user?.[data] : user;
  }
);
