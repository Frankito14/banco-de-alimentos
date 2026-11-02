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
        title: 'Acceso Denegado (RBAC)',
        detail: 'No se encontraron roles OIDC asociados a la identidad del usuario.',
        type: 'https://bancodealimentos.gob.ar/errores/rol-no-encontrado'
      });
    }

    const hasRole = requiredRoles.includes(user.rol);
    if (!hasRole) {
      throw new ProblemDetailsException({
        status: 403,
        title: 'Permisos Insuficientes (RBAC)',
        detail: `El rol '${user.rol}' no tiene permisos para acceder a esta operación. Roles requeridos: [${requiredRoles.join(', ')}].`,
        type: 'https://bancodealimentos.gob.ar/errores/permisos-insuficientes'
      });
    }

    return true;
  }
}
