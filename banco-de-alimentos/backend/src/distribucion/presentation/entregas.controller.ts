import { Body, Controller, HttpCode, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Roles, UsuarioActual } from '../../common/auth/decorators.js';
import type { UsuarioAutenticado } from '../../common/auth/usuario-autenticado.js';
import { RegistrarEntrega } from '../application/registrar-entrega.use-case.js';
import { RegistrarEntregaDto } from './dto/registrar-entrega.dto.js';
import { aEntregaResponse } from './entrega.response.js';

@Controller('entregas')
export class EntregasController {
  constructor(private readonly registrarEntrega: RegistrarEntrega) {}

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
}
