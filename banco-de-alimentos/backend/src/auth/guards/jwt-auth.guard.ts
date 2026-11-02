import {
  ExecutionContext,
  Injectable
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ProblemDetailsException } from '../../common/exceptions/problem-details.exception';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    if (process.env.AUTH_FAKE === 'true') {
      const request = context.switchToHttp().getRequest();
      request.user = request.user || {
        id: 'u-voluntario-1',
        sub: 'u-voluntario-1',
        email: 'voluntario@bancodealimentos.gob.ar',
        nombre: 'Vol Untario',
        rol: 'Voluntario',
      };
      return true;
    }
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
