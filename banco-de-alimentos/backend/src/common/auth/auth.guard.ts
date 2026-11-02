import {
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ROLES_KEY } from './decorators';
import type { Rol, UsuarioAutenticado } from './usuario-autenticado';
import { VERIFICADOR_DE_TOKEN } from './verificador-de-token';
import type { VerificadorDeToken } from './verificador-de-token';

export interface RequestConUsuario extends Request {
  usuario: UsuarioAutenticado;
}

// Se aplica a los endpoints con AuthGuard: 401 si no está logueado, 403 si su rol no puede
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(VERIFICADOR_DE_TOKEN) private readonly verificador: VerificadorDeToken,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<RequestConUsuario>();
    const [tipo, token] = req.headers.authorization?.split(' ') ?? [];
    if (tipo !== 'Bearer' || !token) {
      throw new UnauthorizedException('Falta el token de acceso.');
    }

    const usuario = await this.verificador.verificar(token);
    if (!usuario) throw new UnauthorizedException('El token es inválido o expiró.');
    req.usuario = usuario;

    const roles = this.reflector.getAllAndOverride<Rol[] | undefined>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (roles && !roles.includes(usuario.rol)) {
      throw new ForbiddenException('Tu rol no tiene permiso para realizar esta acción.');
    }
    return true;
  }
}
