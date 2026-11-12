import {
  Controller,
  Get,
  Param,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuditoriaService } from './auditoria.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { OidcJwtPayload } from '../auth/interfaces/oidc-payload.interface';
import { PostgresEntregaRepository } from '../distribucion/infrastructure/postgres.repositories';

@Controller('auditoria')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditoriaController {
  constructor(
    private readonly auditoriaService: AuditoriaService,
    private readonly entregaRepository: PostgresEntregaRepository,
  ) {}

  /**
   * Lista todos los lotes para auditoría
   */
  @Get('lotes')
  @Roles('Coordinador', 'Voluntario')
  async listarLotes() {
    return this.auditoriaService.listarLotes();
  }

  /**
   * Reconstrucción histórica de saldo y trazabilidad de un lote a una fecha determinada.
   * Exigencia del Tribunal de Cuentas (NFR Auditoría e Inmutabilidad).
   */
  @Get('lotes/:loteId/trazabilidad')
  @Roles('Coordinador', 'Voluntario')
  async reconstruirLote(
    @Param('loteId') loteId: string,
    @Query('fecha') fecha?: string,
    @CurrentUser() user?: OidcJwtPayload,
  ) {
    const auditor = user?.nombre || 'Auditor Tribunal de Cuentas';
    return this.auditoriaService.reconstruirEstadoLote(loteId, fecha, auditor);
  }

  /**
   * Exporta reporte consolidado de entregas en formato CSV para el Tribunal de Cuentas
   * Exigencia: "Coordinador: ve todo y exporta reportes".
   */
  @Get('reportes/entregas/csv')
  @Roles('Coordinador', 'Voluntario')
  async exportarReporteEntregasCsv(@Res() res: Response) {
    const entregas = await this.entregaRepository.findAll();

    const header = [
      'ID Entrega',
      'Fecha Despacho',
      'Depósito Origen',
      'Comedor Destino',
      'Estado',
      'Código Lote',
      'Alimento',
      'Cantidad',
      'Unidad Medida',
      'Registrado Por',
      'Fecha Recepción',
      'Horario Recepción',
      'Observaciones',
    ].join(';');

    const filas: string[] = [header];

    for (const e of entregas) {
      if (e.items && e.items.length > 0) {
        for (const item of e.items) {
          filas.push(
            [
              `"${e.id}"`,
              `"${e.fechaCreacion || ''}"`,
              `"${e.depositoNombre || e.depositoId}"`,
              `"${e.comedorNombre || e.comedorId}"`,
              `"${e.estado}"`,
              `"${item.codigoLote || ''}"`,
              `"${item.alimento || ''}"`,
              item.cantidad,
              `"${item.unidadMedida || ''}"`,
              `"${e.createdBy || ''}"`,
              `"${e.fechaRecepcion || ''}"`,
              `"${e.horarioRecepcion || ''}"`,
              `"${(e.observaciones || '').replace(/"/g, '""')}"`,
            ].join(';'),
          );
        }
      } else {
        filas.push(
          [
            `"${e.id}"`,
            `"${e.fechaCreacion || ''}"`,
            `"${e.depositoNombre || e.depositoId}"`,
            `"${e.comedorNombre || e.comedorId}"`,
            `"${e.estado}"`,
            '""',
            '""',
            '0',
            '""',
            `"${e.createdBy || ''}"`,
            `"${e.fechaRecepcion || ''}"`,
            `"${e.horarioRecepcion || ''}"`,
            `"${(e.observaciones || '').replace(/"/g, '""')}"`,
          ].join(';'),
        );
      }
    }

    const csvContent = '\uFEFF' + filas.join('\r\n'); // BOM UTF-8 para Excel en español

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="reporte_entregas_tribunal_cuentas_${new Date().toISOString().slice(0, 10)}.csv"`,
    );
    res.status(200).send(csvContent);
  }
}
