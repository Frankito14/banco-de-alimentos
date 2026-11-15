import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Rol, OidcJwtPayload } from '../interfaces/oidc-payload.interface';
import { ProblemDetailsException } from '../../common/exceptions/problem-details.exception';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Rol[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass()
    ]);

    // Si la ruta no especifica roles, permite el acceso a cualquier usuario autenticado
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest<{ user: OidcJwtPayload }>();

    if (!user || !user.rol) {
      throw new ProblemDetailsException({
        status: 403,
        title: 'Acceso restringido',
        detail: 'No pudimos verificar los permisos de tu cuenta. Volvé a iniciar sesión.',
        type: 'https://bancodealimentos.gob.ar/errores/rol-no-encontrado'
      });
    }

    const hasRole = requiredRoles.includes(user.rol);
    if (!hasRole) {
      throw new ProblemDetailsException({
        status: 403,
        title: 'Acceso restringido',
        detail: `Tu perfil actual (${user.rol}) no tiene permisos para realizar esta acción.`,
        type: 'https://bancodealimentos.gob.ar/errores/permisos-insuficientes'
      });
    }

    return true;
  }
}
