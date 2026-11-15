import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../common/database/database.service';

export interface MovimientoAuditoria {
  tipo: 'INGRESO_DONACION' | 'DESPACHO_ENTREGA' | 'CONFIRMACION_RECEPCION';
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

// Evento de la línea de tiempo antes de calcular el saldo
interface EventoLinea {
  tipo: MovimientoAuditoria['tipo'];
  fecha: Date;
  cantidad: number; // con signo: + ingreso, - entrega, 0 confirmación
  referenciaId: string;
  destinoUOrigen: string;
  responsable: string;
  observaciones: string | null;
  orden: number; // desempate entre eventos con la misma fecha
}

@Injectable()
export class AuditoriaService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * Reconstruye el estado histórico y saldo exacto de un lote a cualquier fecha pasada
   * Requisito estricto Tribunal de Cuentas (NFR Auditoría e Inmutabilidad).
   *
   * El saldo se calcula sumando los movimientos de stock del lote registrados hasta la
   * fecha de corte. Las confirmaciones de recepción se agregan a la línea de tiempo desde
   * el historial de estados de las entregas (no modifican el saldo).
   */
  async reconstruirEstadoLote(
    loteId: string,
    fechaCorteStr?: string,
    auditorNombre = 'Auditor Tribunal de Cuentas',
  ): Promise<ReconstruccionLoteResponse> {
    const fechaCorte = fechaCorteStr ? new Date(fechaCorteStr) : new Date();
    if (Number.isNaN(fechaCorte.getTime())) {
      throw new BadRequestException('La fecha de corte no tiene un formato válido.');
    }

    // 1. Datos del lote y su stock actual
    const loteRes = await this.db.query(
      `SELECT l.id, l.codigo_lote as "codigoLote", l.alimento_nombre as "alimento",
              l.unidad_medida as "unidadMedida", l.cantidad_inicial as "cantidadInicial",
              s.stock as "stockActual",
              TO_CHAR(l.fecha_vencimiento, 'YYYY-MM-DD') as "fechaVencimiento",
              l.donante_origen as "donanteOrigen",
              l.created_at as "fechaIngreso",
              l.id_deposito as "depositoId",
              d.nombre as "depositoNombre"
       FROM lotes l
       JOIN depositos d ON l.id_deposito = d.id
       JOIN v_stock_lotes s ON s.id_lote = l.id
       WHERE l.id = $1 OR l.codigo_lote = $1
       LIMIT 1`,
      [loteId],
    );

    if (loteRes.rows.length === 0) {
      throw new NotFoundException('No se encontró el lote de alimentos seleccionado para auditar.');
    }

    const lote = loteRes.rows[0];

    // 2. Movimientos de stock del lote hasta la fecha de corte
    const movimientosRes = await this.db.query(
      `SELECT m.id, m.tipo_movimiento as "tipo", m.cantidad, m.fecha_hora as "fecha",
              m.id_entrega as "entregaId", m.usuario_nombre as "responsable",
              COALESCE(c.nombre, 'Comedor ' || e.id_comedor) as "comedorNombre",
              e.observaciones
       FROM movimientos_stock m
       LEFT JOIN entregas e ON e.id = m.id_entrega
       LEFT JOIN comedores c ON c.id = e.id_comedor
       WHERE m.id_lote = $1
         AND m.fecha_hora <= $2
       ORDER BY m.fecha_hora ASC, m.id ASC`,
      [lote.id, fechaCorte],
    );

    // 3. Confirmaciones de recepción de las entregas de este lote hasta la fecha de corte
    const confirmacionesRes = await this.db.query(
      `SELECT DISTINCT h.id, h.id_entrega as "entregaId", h.fecha_hora as "fecha",
              h.usuario_nombre as "responsable", h.observaciones,
              COALESCE(c.nombre, 'Comedor ' || e.id_comedor) as "comedorNombre"
       FROM historial_estado_entrega h
       JOIN lotes_entregados le ON le.id_entrega = h.id_entrega
       JOIN entregas e ON e.id = h.id_entrega
       LEFT JOIN comedores c ON c.id = e.id_comedor
       WHERE le.id_lote = $1
         AND h.estado = 'CONFIRMADO'
         AND h.fecha_hora <= $2`,
      [lote.id, fechaCorte],
    );

    const eventos: EventoLinea[] = [
      ...movimientosRes.rows.map((m: any): EventoLinea => {
        const esIngreso = m.tipo === 'INGRESO';
        return {
          tipo: esIngreso ? 'INGRESO_DONACION' : 'DESPACHO_ENTREGA',
          fecha: new Date(m.fecha),
          cantidad: Number(m.cantidad),
          referenciaId: esIngreso ? lote.id : m.entregaId,
          destinoUOrigen: esIngreso ? lote.donanteOrigen || 'Donación Comunitaria' : m.comedorNombre,
          responsable: m.responsable,
          observaciones: esIngreso
            ? 'Partida inicial registrada con control de lote y vencimiento'
            : m.observaciones || 'Despacho registrado',
          orden: esIngreso ? 0 : 1,
        };
      }),
      ...confirmacionesRes.rows.map(
        (h: any): EventoLinea => ({
          tipo: 'CONFIRMACION_RECEPCION',
          fecha: new Date(h.fecha),
          cantidad: 0,
          referenciaId: h.entregaId,
          destinoUOrigen: h.comedorNombre,
          responsable: h.responsable,
          observaciones: h.observaciones || 'Recepción confirmada por el comedor',
          orden: 2,
        }),
      ),
    ].sort((a, b) => a.fecha.getTime() - b.fecha.getTime() || a.orden - b.orden);

    // 4. Línea de tiempo con el saldo resultante después de cada evento
    let saldo = 0;
    const movimientos: MovimientoAuditoria[] = eventos.map((ev) => {
      saldo += ev.cantidad;
      return {
        tipo: ev.tipo,
        fecha: ev.fecha.toISOString(),
        cantidad: Math.abs(ev.cantidad),
        saldoResultante: saldo,
        referenciaId: ev.referenciaId,
        destinoUOrigen: ev.destinoUOrigen,
        responsable: ev.responsable,
        observaciones: ev.observaciones,
      };
    });

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
              s.stock as "stockActual",
              TO_CHAR(l.fecha_vencimiento, 'YYYY-MM-DD') as "fechaVencimiento",
              d.nombre as "depositoNombre"
       FROM lotes l
       JOIN depositos d ON l.id_deposito = d.id
       JOIN v_stock_lotes s ON s.id_lote = l.id
       ORDER BY l.codigo_lote ASC`,
    );
    return res.rows;
  }
}
