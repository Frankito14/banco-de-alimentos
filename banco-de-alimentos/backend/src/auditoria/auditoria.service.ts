import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../common/database/database.service';

export interface MovimientoAuditoria {
  tipo: 'INGRESO_DONACION' | 'DESPACHO_ENTREGA';
  fecha: string;
  cantidad: number;
  saldoResultante: number;
  referenciaId: string;
  destinoUOrigen: string;
  responsable: string;
  observaciones?: string | null;
}

export interface ReconstruccionLoteResponse {
  tribunalDeCuentas: {
    expedienteAuditoria: string;
    fechaAuditoria: string;
    fechaCorteHistorica: string;
    auditor: string;
    dictamen: 'CONFORME_INMUTABLE' | 'OBSERVADO';
  };
  lote: {
    id: string;
    codigoLote: string;
    alimento: string;
    unidadMedida: string;
    depositoId: string;
    depositoNombre: string;
    donanteOrigen: string;
    fechaIngreso: string;
    fechaVencimiento: string;
    cantidadInicial: number;
    stockReconstruidoACorte: number;
    stockActualSistema: number;
  };
  movimientosHistoricos: MovimientoAuditoria[];
}

@Injectable()
export class AuditoriaService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * Reconstruye el estado histórico y saldo exacto de un lote a cualquier fecha pasada
   * Requisito estricto Tribunal de Cuentas (NFR Auditoría e Inmutabilidad).
   */
  async reconstruirEstadoLote(
    loteId: string,
    fechaCorteStr?: string,
    auditorNombre = 'Auditor Tribunal de Cuentas',
  ): Promise<ReconstruccionLoteResponse> {
    // 1. Obtener datos del lote
    const loteRes = await this.db.query(
      `SELECT l.id, l.codigo_lote as "codigoLote", l.alimento_nombre as "alimento",
              l.unidad_medida as "unidadMedida", l.cantidad_inicial as "cantidadInicial",
              l.stock as "stockActual",
              TO_CHAR(l.fecha_vencimiento, 'YYYY-MM-DD') as "fechaVencimiento",
              l.donante_origen as "donanteOrigen",
              l.created_at as "fechaIngreso",
              l.id_deposito as "depositoId",
              d.nombre as "depositoNombre"
       FROM lotes l
       JOIN depositos d ON l.id_deposito = d.id
       WHERE l.id = $1 OR l.codigo_lote = $1
       LIMIT 1`,
      [loteId],
    );

    if (loteRes.rows.length === 0) {
      throw new NotFoundException(`No se encontró el lote con identificador '${loteId}'.`);
    }

    const lote = loteRes.rows[0];
    const fechaCorte = fechaCorteStr ? new Date(fechaCorteStr) : new Date();

    // 2. Consultar todos los despachos/entregas del lote hasta la fecha de corte
    const entregasRes = await this.db.query(
      `SELECT e.id as "entregaId", e.fecha_entrega as "fechaEntrega",
              e.id_comedor as "comedorId", COALESCE(c.nombre, 'Comedor ' || e.id_comedor) as "comedorNombre",
              le.cantidad, e.estado, e.created_by as "responsable", e.observaciones
       FROM lotes_entregados le
       JOIN entregas e ON le.id_entrega = e.id
       LEFT JOIN comedores c ON e.id_comedor = c.id
       WHERE le.id_lote = $1
         AND e.fecha_entrega <= $2
       ORDER BY e.fecha_entrega ASC`,
      [lote.id, fechaCorte.toISOString()],
    );

    // 3. Reconstruir la línea de tiempo inmutable
    const movimientos: MovimientoAuditoria[] = [];
    let saldo = Number(lote.cantidadInicial);

    // Evento inicial: Ingreso al depósito
    movimientos.push({
      tipo: 'INGRESO_DONACION',
      fecha: new Date(lote.fechaIngreso).toISOString(),
      cantidad: Number(lote.cantidadInicial),
      saldoResultante: saldo,
      referenciaId: lote.id,
      destinoUOrigen: lote.donanteOrigen || 'Donación Comunitaria',
      responsable: 'Operador de Ingreso / Donaciones',
      observaciones: 'Partida inicial registrada con control de lote y vencimiento',
    });

    // Despachos cronológicos hasta la fecha de corte
    for (const entrega of entregasRes.rows) {
      const cant = Number(entrega.cantidad);
      saldo -= cant;
      movimientos.push({
        tipo: 'DESPACHO_ENTREGA',
        fecha: new Date(entrega.fechaEntrega).toISOString(),
        cantidad: cant,
        saldoResultante: saldo,
        referenciaId: entrega.entregaId,
        destinoUOrigen: entrega.comedorNombre,
        responsable: entrega.responsable,
        observaciones: entrega.observaciones || `Despacho registrado (Estado: ${entrega.estado})`,
      });
    }

    return {
      tribunalDeCuentas: {
        expedienteAuditoria: `EXP-TC-${lote.codigoLote}-${fechaCorte.toISOString().slice(0, 10)}`,
        fechaAuditoria: new Date().toISOString(),
        fechaCorteHistorica: fechaCorte.toISOString(),
        auditor: auditorNombre,
        dictamen: saldo >= 0 ? 'CONFORME_INMUTABLE' : 'OBSERVADO',
      },
      lote: {
        id: lote.id,
        codigoLote: lote.codigoLote,
        alimento: lote.alimento,
        unidadMedida: lote.unidadMedida,
        depositoId: lote.depositoId,
        depositoNombre: lote.depositoNombre,
        donanteOrigen: lote.donanteOrigen,
        fechaIngreso: new Date(lote.fechaIngreso).toISOString(),
        fechaVencimiento: lote.fechaVencimiento,
        cantidadInicial: Number(lote.cantidadInicial),
        stockReconstruidoACorte: saldo,
        stockActualSistema: Number(lote.stockActual),
      },
      movimientosHistoricos: movimientos,
    };
  }

  /**
   * Lista todos los lotes para permitir seleccionar en la auditoría
   */
  async listarLotes(): Promise<any[]> {
    const res = await this.db.query(
      `SELECT l.id, l.codigo_lote as "codigoLote", l.alimento_nombre as "alimento",
              l.unidad_medida as "unidadMedida", l.cantidad_inicial as "cantidadInicial",
              l.stock as "stockActual",
              TO_CHAR(l.fecha_vencimiento, 'YYYY-MM-DD') as "fechaVencimiento",
              d.nombre as "depositoNombre"
       FROM lotes l
       JOIN depositos d ON l.id_deposito = d.id
       ORDER BY l.codigo_lote ASC`,
    );
    return res.rows;
  }
}
