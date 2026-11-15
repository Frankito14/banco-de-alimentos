import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import type { Deposito, Entrega, EstadoEntrega, Lote, Usuario } from '../domain/entities';
import { EntregaYaConfirmadaError, StockInsuficienteError } from '../domain/errors/entrega.errors';
import type { DepositoRepository, EntregaRepository, LoteRepository } from '../application/ports';

const ZONA_HORARIA = 'America/Argentina/Buenos_Aires';

// En la base el estado final se llama CONFIRMADO; en la API y el frontend, ENTREGADO
function aEstadoDominio(estadoBase: string | null): EstadoEntrega {
  if (estadoBase === 'CONFIRMADO') return 'ENTREGADO';
  if (estadoBase === 'CANCELADO') return 'CANCELADO';
  return 'PENDIENTE';
}

// Expresión SQL equivalente a aEstadoDominio, para las consultas de listados
const ESTADO_SQL = `CASE ve.estado WHEN 'CONFIRMADO' THEN 'ENTREGADO' WHEN 'CANCELADO' THEN 'CANCELADO' ELSE 'PENDIENTE' END`;

@Injectable()
export class PostgresDepositoRepository implements DepositoRepository {
  private readonly logger = new Logger(PostgresDepositoRepository.name);

  constructor(private readonly db: DatabaseService) {}

  async findById(id: string): Promise<Deposito | null> {
    try {
      const res = await this.db.query<{ id: string; nombre: string }>(
        'SELECT id, nombre FROM depositos WHERE id = $1 LIMIT 1',
        [id],
      );
      if (res.rows.length === 0) return null;
      return { id: res.rows[0].id, nombre: res.rows[0].nombre };
    } catch (err) {
      this.logger.error(`Error findById en PostgresDepositoRepository: ${(err as Error).message}`);
      return null;
    }
  }

  async findAll(): Promise<any[]> {
    try {
      const res = await this.db.query(
        `SELECT id, nombre, direccion, localidad, capacidad_total as "capacidadTotal"
         FROM depositos
         ORDER BY id ASC`,
      );
      return res.rows;
    } catch (err) {
      this.logger.error(`Error findAll en PostgresDepositoRepository: ${(err as Error).message}`);
      return [];
    }
  }
}

@Injectable()
export class PostgresLoteRepository implements LoteRepository {
  private readonly logger = new Logger(PostgresLoteRepository.name);

  constructor(private readonly db: DatabaseService) {}

  async findById(id: string): Promise<Lote | null> {
    try {
      const res = await this.db.query<{
        id: string;
        id_deposito: string;
        alimento_nombre: string;
        codigo_lote: string;
        unidad_medida: string;
        stock: number;
        fecha_vencimiento: Date;
      }>(
        `SELECT l.id, l.id_deposito, l.alimento_nombre, l.codigo_lote, l.unidad_medida,
                s.stock, l.fecha_vencimiento
         FROM lotes l
         JOIN v_stock_lotes s ON s.id_lote = l.id
         WHERE l.id = $1
         LIMIT 1`,
        [id],
      );
      if (res.rows.length === 0) return null;
      const row = res.rows[0];
      return {
        id: row.id,
        depositoId: row.id_deposito,
        alimento: row.alimento_nombre,
        codigoLote: row.codigo_lote,
        unidadMedida: row.unidad_medida,
        stockDisponible: Number(row.stock),
        fechaVencimiento: new Date(row.fecha_vencimiento),
      };
    } catch (err) {
      this.logger.error(`Error findById en PostgresLoteRepository: ${(err as Error).message}`);
      return null;
    }
  }

  async findByDepositoId(depositoId: string): Promise<any[]> {
    try {
      const res = await this.db.query(
        `SELECT l.id, l.id_deposito as "depositoId", l.alimento_nombre as "alimento",
                l.codigo_lote as "codigoLote", s.stock as "stockDisponible",
                l.unidad_medida as "unidadMedida",
                TO_CHAR(l.fecha_vencimiento, 'YYYY-MM-DD') as "fechaVencimiento",
                l.donante_origen as "donanteOrigen"
         FROM lotes l
         JOIN v_stock_lotes s ON s.id_lote = l.id
         WHERE l.id_deposito = $1
         ORDER BY l.fecha_vencimiento ASC`,
        [depositoId],
      );
      return res.rows;
    } catch (err) {
      this.logger.error(`Error findByDepositoId en PostgresLoteRepository: ${(err as Error).message}`);
      return [];
    }
  }
}

@Injectable()
export class PostgresEntregaRepository implements EntregaRepository {
  private readonly logger = new Logger(PostgresEntregaRepository.name);

  constructor(private readonly db: DatabaseService) {}

  async findById(id: string): Promise<Entrega | null> {
    try {
      const res = await this.db.query<any>(
        `SELECT e.id, e.id_deposito, e.id_comedor, e.observaciones, e.fecha_creacion,
                e.creado_por_usuario_id, e.creado_por_nombre,
                ve.estado,
                hc.fecha_hora AS fecha_recepcion,
                hc.observaciones AS observaciones_recepcion
         FROM entregas e
         LEFT JOIN v_estado_entregas ve ON ve.id_entrega = e.id
         LEFT JOIN historial_estado_entrega hc ON hc.id_entrega = e.id AND hc.estado = 'CONFIRMADO'
         WHERE e.id = $1
         LIMIT 1`,
        [id],
      );
      if (res.rows.length === 0) return null;
      const row = res.rows[0];

      const lotesRes = await this.db.query<{ id: string; id_lote: string; cantidad: number }>(
        'SELECT id, id_lote, cantidad FROM lotes_entregados WHERE id_entrega = $1 ORDER BY id',
        [id],
      );

      return {
        id: row.id,
        depositoId: row.id_deposito,
        comedorId: row.id_comedor,
        estado: aEstadoDominio(row.estado),
        fechaEntrega: new Date(row.fecha_creacion),
        fechaRecepcion: row.fecha_recepcion ? new Date(row.fecha_recepcion) : null,
        creadoPor: row.creado_por_nombre,
        creadoPorId: row.creado_por_usuario_id,
        observaciones: row.observaciones ?? null,
        observacionesRecepcion: row.observaciones_recepcion ?? null,
        lotes: lotesRes.rows.map((l) => ({
          id: l.id,
          loteId: l.id_lote,
          cantidad: Number(l.cantidad),
        })),
      };
    } catch (err) {
      this.logger.error(`Error findById en PostgresEntregaRepository: ${(err as Error).message}`);
      return null;
    }
  }

  async findAll(filter?: { comedorId?: string; depositoId?: string }): Promise<any[]> {
    try {
      let query = `
        SELECT e.id, e.id_deposito as "depositoId", d.nombre as "depositoNombre",
               e.id_comedor as "comedorId", COALESCE(c.nombre, 'Comedor ' || e.id_comedor) as "comedorNombre",
               ${ESTADO_SQL} as estado,
               e.fecha_creacion as "fechaCreacion",
               TO_CHAR(hc.fecha_hora AT TIME ZONE '${ZONA_HORARIA}', 'YYYY-MM-DD') as "fechaRecepcion",
               TO_CHAR(hc.fecha_hora AT TIME ZONE '${ZONA_HORARIA}', 'HH24:MI') as "horarioRecepcion",
               e.creado_por_nombre as "createdBy",
               COALESCE(hc.observaciones, e.observaciones) as observaciones
        FROM entregas e
        LEFT JOIN depositos d ON e.id_deposito = d.id
        LEFT JOIN comedores c ON e.id_comedor = c.id
        LEFT JOIN v_estado_entregas ve ON ve.id_entrega = e.id
        LEFT JOIN historial_estado_entrega hc ON hc.id_entrega = e.id AND hc.estado = 'CONFIRMADO'
        WHERE 1=1
      `;
      const params: any[] = [];
      if (filter?.comedorId) {
        params.push(filter.comedorId);
        query += ` AND e.id_comedor = $${params.length}`;
      }
      if (filter?.depositoId) {
        params.push(filter.depositoId);
        query += ` AND e.id_deposito = $${params.length}`;
      }
      query += ' ORDER BY e.fecha_creacion DESC';

      const res = await this.db.query(query, params);

      // Traer los items de cada entrega
      const entregas = [];
      for (const row of res.rows) {
        const itemsRes = await this.db.query(
          `SELECT le.id_lote as "loteId", l.alimento_nombre as "alimento",
                  l.codigo_lote as "codigoLote", le.cantidad, l.unidad_medida as "unidadMedida"
           FROM lotes_entregados le
           JOIN lotes l ON le.id_lote = l.id
           WHERE le.id_entrega = $1
           ORDER BY le.id`,
          [row.id],
        );
        entregas.push({
          ...row,
          items: itemsRes.rows,
        });
      }
      return entregas;
    } catch (err) {
      this.logger.error(`Error findAll en PostgresEntregaRepository: ${(err as Error).message}`);
      return [];
    }
  }

  async registrar(entrega: Entrega, usuario: Usuario): Promise<void> {
    const cantidadPorLote = new Map<string, number>();
    for (const item of entrega.lotes) {
      cantidadPorLote.set(item.loteId, (cantidadPorLote.get(item.loteId) ?? 0) + item.cantidad);
    }
    const loteIds = [...cantidadPorLote.keys()].sort();

    await this.db.transaction(async (client) => {
      // 1. Bloquear los lotes involucrados (en orden, para evitar deadlocks) y recalcular
      //    su stock: dos entregas simultáneas del mismo lote se procesan de a una.
      const lotesRes = await client.query<{
        id: string;
        alimento_nombre: string;
        codigo_lote: string;
        unidad_medida: string;
      }>(
        `SELECT id, alimento_nombre, codigo_lote, unidad_medida
         FROM lotes
         WHERE id = ANY($1::varchar[])
         ORDER BY id
         FOR UPDATE`,
        [loteIds],
      );
      const stockRes = await client.query<{ id_lote: string; stock: number }>(
        `SELECT id_lote, COALESCE(SUM(cantidad), 0)::int AS stock
         FROM movimientos_stock
         WHERE id_lote = ANY($1::varchar[])
         GROUP BY id_lote`,
        [loteIds],
      );
      const stockPorLote = new Map(stockRes.rows.map((r) => [r.id_lote, Number(r.stock)]));

      for (const lote of lotesRes.rows) {
        const disponible = stockPorLote.get(lote.id) ?? 0;
        const solicitado = cantidadPorLote.get(lote.id) ?? 0;
        if (solicitado > disponible) {
          throw new StockInsuficienteError(
            lote.id,
            disponible,
            solicitado,
            lote.alimento_nombre,
            lote.codigo_lote,
            lote.unidad_medida,
          );
        }
      }

      // 2. Cabecera de la entrega
      await client.query(
        `INSERT INTO entregas (id, id_deposito, id_comedor, observaciones, fecha_creacion, creado_por_usuario_id, creado_por_nombre)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          entrega.id,
          entrega.depositoId,
          entrega.comedorId,
          entrega.observaciones ?? null,
          entrega.fechaEntrega,
          usuario.id,
          usuario.nombre,
        ],
      );

      // 3. Renglones de la entrega y un movimiento de stock negativo por cada uno
      for (const item of entrega.lotes) {
        await client.query(
          `INSERT INTO lotes_entregados (id, id_entrega, id_lote, cantidad, created_at)
           VALUES ($1, $2, $3, $4, $5)`,
          [item.id, entrega.id, item.loteId, item.cantidad, entrega.fechaEntrega],
        );
        await client.query(
          `INSERT INTO movimientos_stock (id_lote, id_entrega, tipo_movimiento, cantidad, fecha_hora, usuario_id, usuario_nombre)
           VALUES ($1, $2, 'ENTREGA_RESERVADA', $3, $4, $5, $6)`,
          [item.loteId, entrega.id, -item.cantidad, entrega.fechaEntrega, usuario.id, usuario.nombre],
        );
      }

      // 4. Estado inicial en el historial
      await client.query(
        `INSERT INTO historial_estado_entrega (id_entrega, estado, fecha_hora, usuario_id, usuario_nombre)
         VALUES ($1, 'PENDIENTE', $2, $3, $4)`,
        [entrega.id, entrega.fechaEntrega, usuario.id, usuario.nombre],
      );
    });
  }

  async registrarConfirmacion(
    entregaId: string,
    usuario: Usuario,
    fecha: Date,
    observaciones: string | null,
  ): Promise<void> {
    try {
      await this.db.query(
        `INSERT INTO historial_estado_entrega (id_entrega, estado, fecha_hora, usuario_id, usuario_nombre, observaciones)
         VALUES ($1, 'CONFIRMADO', $2, $3, $4, $5)`,
        [entregaId, fecha, usuario.id, usuario.nombre, observaciones],
      );
    } catch (err) {
      // Índice único (id_entrega, estado): la entrega ya tenía una confirmación
      if ((err as { code?: string }).code === '23505') {
        throw new EntregaYaConfirmadaError(entregaId);
      }
      throw err;
    }
  }
}
