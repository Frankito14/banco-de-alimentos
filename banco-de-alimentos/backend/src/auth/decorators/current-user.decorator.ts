import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { OidcJwtPayload } from '../interfaces/oidc-payload.interface';

export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as (OidcJwtPayload & { id?: string }) | undefined;
    if (!user) return null;
    if (data === 'id') return user.id || user.sub;
    return data ? (user as any)[data] : user;
  }
);

export const UsuarioActual = CurrentUser;
