import {
  ExecutionContext,
  Injectable,
  UnauthorizedException
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ProblemDetailsException } from '../../common/exceptions/problem-details.exception';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    if (err || !user) {
      throw new ProblemDetailsException({
        status: 401,
        title: 'No Autenticado (OIDC)',
        detail:
          info?.message === 'jwt expired'
            ? 'El token OIDC JWT ha expirado. Por favor, inicie sesión nuevamente.'
            : 'Token OIDC ausente o inválido en el header Authorization Bearer.',
        type: 'https://bancodealimentos.gob.ar/errores/token-invalido'
      });
    }
    return user;
  }
}
