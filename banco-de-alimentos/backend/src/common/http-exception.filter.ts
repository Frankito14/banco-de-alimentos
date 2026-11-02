import { Catch, HttpException } from '@nestjs/common';
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import type { Request, Response } from 'express';

const BASE_TYPE = 'https://api.bancodealimentos.gob.ar/problemas/';

const PROBLEMAS: Record<number, { code: string; title: string }> = {
  400: { code: 'solicitud-invalida', title: 'Solicitud inválida' },
  401: { code: 'no-autenticado', title: 'No autenticado' },
  403: { code: 'acceso-denegado', title: 'Permisos insuficientes' },
  404: { code: 'recurso-no-encontrado', title: 'Recurso no encontrado' },
};

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const status = exception.getStatus();
    const problema = PROBLEMAS[status] ?? { code: 'error', title: exception.message };

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
