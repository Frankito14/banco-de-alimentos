import { Catch, HttpException } from '@nestjs/common';
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ProblemDetailsException } from './exceptions/problem-details.exception';

const BASE_TYPE = 'https://api.bancodealimentos.gob.ar/problemas/';

const PROBLEMAS: Record<number, { code: string; title: string }> = {
  400: { code: 'solicitud-invalida', title: 'Datos inválidos' },
  401: { code: 'no-autenticado', title: 'Sesión no iniciada' },
  403: { code: 'acceso-denegado', title: 'Acceso restringido' },
  404: { code: 'recurso-no-encontrado', title: 'No encontrado' },
  503: { code: 'servicio-no-disponible', title: 'Servicio temporalmente no disponible' },
};

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    if (exception instanceof ProblemDetailsException) {
      const { status, title, detail, type, invalidParams } = exception.problem;
      res
        .status(status)
        .type('application/problem+json')
        .json({
          type: type || `${BASE_TYPE}${PROBLEMAS[status]?.code ?? 'error'}`,
          title,
          status,
          detail,
          instance: req.originalUrl,
          ...(invalidParams ? { invalidParams } : {}),
        });
      return;
    }

    const status = exception.getStatus();
    const problema = PROBLEMAS[status] ?? { code: 'error', title: 'No se pudo completar la operación' };

    const body = exception.getResponse();
    const mensajes =
      typeof body === 'object' && 'message' in body ? body.message : exception.message;
    const detail = Array.isArray(mensajes) ? mensajes.join(' ') : String(mensajes);

    res
      .status(status)
      .type('application/problem+json')
      .json({
        type: `${BASE_TYPE}${problema.code}`,
        title: problema.title,
        status,
        detail,
        instance: req.originalUrl,
      });
  }
}
