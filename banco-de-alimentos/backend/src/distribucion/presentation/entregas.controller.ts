import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
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
import { PostgresEntregaRepository } from '../infrastructure/postgres.repositories';

@Controller('entregas')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EntregasController {
  constructor(
    private readonly registrarEntrega: RegistrarEntrega,
    private readonly confirmarEntrega: ConfirmarEntrega,
    private readonly entregaRepository: PostgresEntregaRepository,
  ) {}

  @Post()
  @HttpCode(201)
  @Roles('Voluntario')
  async registrar(
    @Body() dto: RegistrarEntregaDto,
    @CurrentUser() usuario: OidcJwtPayload & { id?: string; nombre?: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const lotes = dto.lotes || dto.items || [];
    if (!lotes || lotes.length === 0) {
      throw new BadRequestException('Debe incluir al menos un lote para la entrega');
    }
    const userId = usuario?.nombre || usuario?.id || usuario?.sub || 'usr-voluntario-1';
    const entrega = await this.registrarEntrega.ejecutar({
      depositoId: dto.depositoId,
      comedorId: dto.comedorId,
      lotes,
      creadoPor: userId,
    });
    res.setHeader('Location', `/api/v1/entregas/${entrega.id}`);
    return aEntregaResponse(entrega);
  }

  @Get()
  @Roles('Voluntario', 'ReferenteComedor', 'Coordinador')
  async listarEntregas(
    @CurrentUser() user: OidcJwtPayload,
    @Query('comedorId') comedorId?: string,
    @Query('depositoId') depositoId?: string,
  ) {
    let filtroComedor = comedorId;

    // Regla de Aislamiento y Seguridad (RBAC / Tenancy):
    // Un Referente de Comedor solo puede visualizar los pedidos dirigidos a su propio comedor.
    if (user.rol === 'ReferenteComedor') {
      filtroComedor = user.comedorAsignadoId || 'SIN_COMEDOR_ASIGNADO';
    }

    return this.entregaRepository.findAll({ comedorId: filtroComedor, depositoId });
  }

  @Get(':entregaId')
  @Roles('Voluntario', 'ReferenteComedor', 'Coordinador')
  async obtenerDetalle(
    @CurrentUser() user: OidcJwtPayload,
    @Param('entregaId') entregaId: string,
  ) {
    const entrega = await this.entregaRepository.findById(entregaId);
    if (!entrega) {
      throw new NotFoundException(`No se encontró la entrega con ID ${entregaId}`);
    }

    if (
      user.rol === 'ReferenteComedor' &&
      user.comedorAsignadoId &&
      entrega.comedorId !== user.comedorAsignadoId
    ) {
      throw new BadRequestException('No tiene permisos para consultar entregas pertenecientes a otro comedor.');
    }

    return aEntregaResponse(entrega);
  }

  @Patch(':entregaId/recepcion')
  @HttpCode(200)
  @Roles('ReferenteComedor', 'Coordinador')
  async confirmar(
    @CurrentUser() user: OidcJwtPayload,
    @Param('entregaId') entregaId: string,
    @Body() dto: RecepcionEntregaDto,
  ) {
    const entregaExistente = await this.entregaRepository.findById(entregaId);
    if (!entregaExistente) {
      throw new NotFoundException(`No se encontró la entrega con ID ${entregaId}`);
    }

    if (
      user.rol === 'ReferenteComedor' &&
      user.comedorAsignadoId &&
      entregaExistente.comedorId !== user.comedorAsignadoId
    ) {
      throw new BadRequestException('No puede confirmar la recepción de un pedido asignado a otro comedor.');
    }

    const entrega = await this.confirmarEntrega.ejecutar(entregaId);
    return aEntregaResponse(entrega);
  }
}
