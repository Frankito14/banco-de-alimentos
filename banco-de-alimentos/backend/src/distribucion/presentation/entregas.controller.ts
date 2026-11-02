import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { OidcJwtPayload } from '../../auth/interfaces/oidc-payload.interface';
import { ConfirmarEntrega } from '../application/confirmar-entrega.use-case';
import { RegistrarEntrega } from '../application/registrar-entrega.use-case';
import { RecepcionEntregaDto } from './dto/recepcion-entrega.dto';
import { RegistrarEntregaDto } from './dto/registrar-entrega.dto';
import { aEntregaResponse } from './entrega.response';
import { ENTREGA_REPOSITORY } from '../application/ports';
import type { EntregaRepository } from '../application/ports';
import { Inject } from '@nestjs/common';

@Controller('entregas')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EntregasController {
  constructor(
    private readonly registrarEntrega: RegistrarEntrega,
    private readonly confirmarEntrega: ConfirmarEntrega,
    @Inject(ENTREGA_REPOSITORY)
    private readonly entregaRepository: EntregaRepository,
  ) {}

  @Post()
  @HttpCode(201)
  @Roles('Voluntario')
  async registrar(
    @Body() dto: RegistrarEntregaDto,
    @CurrentUser() usuario: OidcJwtPayload & { id?: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const userId = usuario?.id || usuario?.sub || 'usr-voluntario-1';
    const entrega = await this.registrarEntrega.ejecutar({ ...dto, creadoPor: userId });
    res.setHeader('Location', `/api/v1/entregas/${entrega.id}`);
    return aEntregaResponse(entrega);
  }

  @Get(':entregaId')
  @Roles('Voluntario', 'ReferenteComedor', 'Coordinador')
  async obtenerDetalle(
    @Param(
      'entregaId',
      new ParseUUIDPipe({
        exceptionFactory: () =>
          new BadRequestException('El parámetro entregaId debe ser un UUID válido.'),
      }),
    )
    entregaId: string,
  ) {
    const entrega = await this.entregaRepository.findById(entregaId);
    if (!entrega) {
      throw new NotFoundException(`No se encontró la entrega con ID ${entregaId}`);
    }
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
