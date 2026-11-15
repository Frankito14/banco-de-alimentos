import { Catch } from '@nestjs/common';
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  RecursoNoEncontradoError,
  ReglaDeNegocioError,
  ReferenciaInvalidaError,
} from '../distribucion/domain/errors/domain-error';

const BASE_TYPE = 'https://api.bancodealimentos.gob.ar/problemas/';

@Catch(ReglaDeNegocioError, RecursoNoEncontradoError, ReferenciaInvalidaError)
export class DomainExceptionFilter implements ExceptionFilter {
  catch(error: ReglaDeNegocioError | RecursoNoEncontradoError | ReferenciaInvalidaError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const status =
      error instanceof ReglaDeNegocioError
        ? 409
        : error instanceof RecursoNoEncontradoError
          ? 404
          : 400;

    res
      .status(status)
      .type('application/problem+json')
      .json({
        type: `${BASE_TYPE}${error.code}`,
        title: error.title,
        status,
        detail: error.message,
        instance: req.originalUrl,
      });
  }
}
