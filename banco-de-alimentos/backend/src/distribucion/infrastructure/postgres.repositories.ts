import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import type { Comedor, Deposito, Entrega, Lote, LoteEntregado } from '../domain/entities';
import type { DepositoRepository, EntregaRepository, LoteRepository } from '../application/ports';

@Injectable()
export class PostgresDepositoRepository implements DepositoRepository {
  private readonly logger = new Logger(PostgresDepositoRepository.name);

  constructor(private readonly db: DatabaseService) {}

  async findById(id: string): Promise<Deposito | null> {
    try {
      const res = await this.db.query<{ id: string }>(
        'SELECT id FROM depositos WHERE id = $1 LIMIT 1',
        [id],
      );
      if (res.rows.length === 0) return null;
      return { id: res.rows[0].id };
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
        stock: number;
        fecha_vencimiento: Date;
      }>(
        'SELECT id, id_deposito, stock, fecha_vencimiento FROM lotes WHERE id = $1 LIMIT 1',
        [id],
      );
      if (res.rows.length === 0) return null;
      const row = res.rows[0];
      return {
        id: row.id,
        depositoId: row.id_deposito,
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
        `SELECT id, id_deposito as "depositoId", alimento_nombre as "alimento",
                codigo_lote as "codigoLote", stock as "stockDisponible",
                unidad_medida as "unidadMedida", 
                TO_CHAR(fecha_vencimiento, 'YYYY-MM-DD') as "fechaVencimiento",
                donante_origen as "donanteOrigen"
         FROM lotes 
         WHERE id_deposito = $1 
         ORDER BY fecha_vencimiento ASC`,
        [depositoId],
      );
      return res.rows;
    } catch (err) {
      this.logger.error(`Error findByDepositoId en PostgresLoteRepository: ${(err as Error).message}`);
      return [];
    }
  }

  async save(lote: Lote): Promise<void> {
    await this.db.query(
      'UPDATE lotes SET stock = $1 WHERE id = $2',
      [lote.stockDisponible, lote.id],
    );
  }
}

@Injectable()
export class PostgresEntregaRepository implements EntregaRepository {
  private readonly logger = new Logger(PostgresEntregaRepository.name);

  constructor(private readonly db: DatabaseService) {}

  async findById(id: string): Promise<Entrega | null> {
    try {
      const res = await this.db.query<any>(
        `SELECT id, id_deposito, id_comedor, estado, fecha_entrega, fecha_recepcion, created_by 
         FROM entregas 
         WHERE id = $1 LIMIT 1`,
        [id],
      );
      if (res.rows.length === 0) return null;
      const row = res.rows[0];

      const lotesRes = await this.db.query<{ id: string; id_lote: string; cantidad: number }>(
        'SELECT id, id_lote, cantidad FROM lotes_entregados WHERE id_entrega = $1',
        [id],
      );

      return {
        id: row.id,
        depositoId: row.id_deposito,
        comedorId: row.id_comedor,
        estado: row.estado,
        fechaEntrega: new Date(row.fecha_entrega),
        fechaRecepcion: row.fecha_recepcion ? new Date(row.fecha_recepcion) : null,
        creadoPor: row.created_by,
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
               e.estado, e.fecha_entrega as "fechaCreacion",
               TO_CHAR(e.fecha_recepcion, 'YYYY-MM-DD') as "fechaRecepcion",
               e.horario_recepcion as "horarioRecepcion",
               e.created_by as "createdBy", e.observaciones
        FROM entregas e
        LEFT JOIN depositos d ON e.id_deposito = d.id
        LEFT JOIN comedores c ON e.id_comedor = c.id
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
      query += ' ORDER BY e.fecha_entrega DESC';

      const res = await this.db.query(query, params);

      // Traer los items de cada entrega
      const entregas = [];
      for (const row of res.rows) {
        const itemsRes = await this.db.query(
          `SELECT le.id_lote as "loteId", l.alimento_nombre as "alimento",
                  l.codigo_lote as "codigoLote", le.cantidad, l.unidad_medida as "unidadMedida"
           FROM lotes_entregados le
           JOIN lotes l ON le.id_lote = l.id
           WHERE le.id_entrega = $1`,
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

  async save(entrega: Entrega): Promise<void> {
    const existing = await this.db.query('SELECT id FROM entregas WHERE id = $1', [entrega.id]);
    if (existing.rows.length === 0) {
      await this.db.query(
        `INSERT INTO entregas (id, id_deposito, id_comedor, estado, fecha_entrega, fecha_recepcion, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          entrega.id,
          entrega.depositoId,
          entrega.comedorId,
          entrega.estado,
          entrega.fechaEntrega,
          entrega.fechaRecepcion,
          entrega.creadoPor,
        ],
      );

      for (const item of entrega.lotes) {
        await this.db.query(
          `INSERT INTO lotes_entregados (id, id_entrega, id_lote, cantidad)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (id) DO NOTHING`,
          [item.id, entrega.id, item.loteId, item.cantidad],
        );
      }
    } else {
      await this.db.query(
        `UPDATE entregas 
         SET estado = $1, fecha_recepcion = $2, horario_recepcion = $3
         WHERE id = $4`,
        [
          entrega.estado,
          entrega.fechaRecepcion,
          entrega.fechaRecepcion ? entrega.fechaRecepcion.toTimeString().split(' ')[0].substring(0, 5) : null,
          entrega.id,
        ],
      );
    }
  }
}
