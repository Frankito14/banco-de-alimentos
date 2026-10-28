import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ProblemDetailsException } from '../exceptions/problem-details.exception';

@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let title = 'Error Interno del Servidor';
    let detail = 'Ocurrió un error inesperado al procesar la solicitud.';
    let type = 'https://bancodealimentos.gob.ar/errores/error-interno';
    let invalidParams = undefined;

    if (exception instanceof ProblemDetailsException) {
      status = exception.problem.status;
      title = exception.problem.title;
      detail = exception.problem.detail;
      type = exception.problem.type || type;
      invalidParams = exception.problem.invalidParams;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'object' && res !== null) {
        const resObj = res as any;
        title = resObj.error || exception.message || 'Error HTTP';
        detail = Array.isArray(resObj.message) ? resObj.message.join(', ') : resObj.message || exception.message;
      } else {
        title = exception.message;
        detail = String(res);
      }

      if (status === HttpStatus.UNAUTHORIZED) {
        type = 'https://bancodealimentos.gob.ar/errores/no-autenticado';
        title = 'No Autenticado (OIDC)';
      } else if (status === HttpStatus.FORBIDDEN) {
        type = 'https://bancodealimentos.gob.ar/errores/acceso-denegado';
        title = 'Permisos Insuficientes (RBAC)';
      }
    } else if (exception instanceof Error) {
      detail = exception.message;
    }

    const problemPayload = {
      type,
      title,
      status,
      detail,
      instance: request.originalUrl,
      ...(invalidParams ? { invalidParams } : {})
    };

    response
      .status(status)
      .header('Content-Type', 'application/problem+json')
      .json(problemPayload);
  }
}
