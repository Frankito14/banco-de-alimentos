import { Catch } from '@nestjs/common';
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  RecursoNoEncontradoError,
  ReglaDeNegocioError,
  ReferenciaInvalidaError,
} from '../distribucion/domain/errors/domain-error.js';

const BASE_TYPE = 'https://api.bancodealimentos.gob.ar/problemas/';

@Catch(ReglaDeNegocioError, RecursoNoEncontradoError, ReferenciaInvalidaError)
export class DomainExceptionFilter implements ExceptionFilter {
  catch(error: ReglaDeNegocioError | RecursoNoEncontradoError | ReferenciaInvalidaError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const { status, title } =
      error instanceof ReglaDeNegocioError
        ? { status: 409, title: 'Conflicto con regla de negocio' }
        : error instanceof RecursoNoEncontradoError
          ? { status: 404, title: 'Recurso inexistente' }
          : { status: 400, title: 'Referencia inválida' };

    res
      .status(status)
      .type('application/problem+json')
      .json({
        type: `${BASE_TYPE}${error.code}`,
        title,
        status,
        detail: error.message,
        instance: req.originalUrl,
      });
  }
}


