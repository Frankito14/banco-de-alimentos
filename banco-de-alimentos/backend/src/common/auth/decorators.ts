import { SetMetadata, createParamDecorator } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { RequestConUsuario } from './auth.guard.js';
import type { Rol } from './usuario-autenticado.js';

export const ROLES_KEY = 'roles';

// Roles que pueden usar el endpoint
export const Roles = (...roles: Rol[]) => SetMetadata(ROLES_KEY, roles);


// Usuario logueado
export const UsuarioActual = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) =>
    ctx.switchToHttp().getRequest<RequestConUsuario>().usuario,
);
