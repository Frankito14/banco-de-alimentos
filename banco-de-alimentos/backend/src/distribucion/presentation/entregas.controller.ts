import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { Roles, UsuarioActual } from '../../common/auth/decorators.js';
import type { UsuarioAutenticado } from '../../common/auth/usuario-autenticado.js';
import { ConfirmarEntrega } from '../application/confirmar-entrega.use-case.js';
import { RegistrarEntrega } from '../application/registrar-entrega.use-case.js';
import { RecepcionEntregaDto } from './dto/recepcion-entrega.dto.js';
import { RegistrarEntregaDto } from './dto/registrar-entrega.dto.js';
import { aEntregaResponse } from './entrega.response.js';

@Controller('entregas')
export class EntregasController {
  constructor(
    private readonly registrarEntrega: RegistrarEntrega,
    private readonly confirmarEntrega: ConfirmarEntrega,
  ) {}

  @Post()
  @HttpCode(201)
  @Roles('Voluntario')
  async registrar(
    @Body() dto: RegistrarEntregaDto,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Res({ passthrough: true }) res: Response,
  ) {
    const entrega = await this.registrarEntrega.ejecutar({ ...dto, creadoPor: usuario.id });
    res.setHeader('Location', `/api/v1/entregas/${entrega.id}`);
    return aEntregaResponse(entrega);
  }

  // Falta definir que pasa con { "recepcionConforme": false } (por ahora entrega igualmente)
  @Patch(':entregaId/recepcion')
  @HttpCode(200)
  @Roles('ReferenteComedor')
  async confirmar(
    @Param(
      'entregaId',
      new ParseUUIDPipe({
        exceptionFactory: () =>
          new BadRequestException('El parámetro entregaId debe ser un UUID válido.'),
      }),
    )
    entregaId: string,
    @Body() _dto: RecepcionEntregaDto,
  ) {
    const entrega = await this.confirmarEntrega.ejecutar(entregaId);
    return aEntregaResponse(entrega);
  }
}
