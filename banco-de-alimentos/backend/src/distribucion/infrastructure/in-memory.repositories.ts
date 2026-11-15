import type { Comedor, Deposito, Entrega, Lote, Usuario } from '../domain/entities';
import { EntregaYaConfirmadaError, StockInsuficienteError } from '../domain/errors/entrega.errors';
import type {
  ComedorRepository,
  DepositoRepository,
  EntregaRepository,
  LoteRepository,
  PublicadorDeEntregas,
} from '../application/ports';

export const DEPOSITO_1 = 'd3b07384-d113-40e4-a123-167162354a01';
export const COMEDOR_HABILITADO = 'c8e12345-e89b-42d3-a456-426614174000';
export const COMEDOR_NO_HABILITADO = 'c8e12345-e89b-42d3-a456-426614174001';
export const LOTE_OK = 'a1b2c3d4-e5f6-4890-b234-567890abcdef';

export class InMemoryDepositoRepository implements DepositoRepository {
  private readonly datos = new Map<string, Deposito>([
    [DEPOSITO_1, { id: DEPOSITO_1 }],
  ]);
  async findById(id: string) {
    return this.datos.get(id) ?? null;
  }
}

export class InMemoryComedorRepository implements ComedorRepository {
  private readonly datos = new Map<string, Comedor>([
    [COMEDOR_HABILITADO, { id: COMEDOR_HABILITADO, habilitado: true }],
    [COMEDOR_NO_HABILITADO, { id: COMEDOR_NO_HABILITADO, habilitado: false }],
  ]);
  async findById(id: string) {
    return this.datos.get(id) ?? null;
  }
}

// Movimientos de stock en memoria: el stock de un lote es la suma de sus movimientos
export class InMemoryMovimientos {
  readonly movimientos: { loteId: string; cantidad: number }[] = [{ loteId: LOTE_OK, cantidad: 100 }];

  stock(loteId: string): number {
    return this.movimientos.filter((m) => m.loteId === loteId).reduce((total, m) => total + m.cantidad, 0);
  }
}

export class InMemoryLoteRepository implements LoteRepository {
  private readonly datos = new Map<string, Omit<Lote, 'stockDisponible'>>([
    [LOTE_OK, { id: LOTE_OK, depositoId: DEPOSITO_1, fechaVencimiento: new Date('2030-12-31') }],
  ]);

  constructor(private readonly movimientos: InMemoryMovimientos) {}

  async findById(id: string): Promise<Lote | null> {
    const lote = this.datos.get(id);
    return lote ? { ...lote, stockDisponible: this.movimientos.stock(id) } : null;
  }
}

export class InMemoryEntregaRepository implements EntregaRepository {
  private readonly entregas = new Map<string, Entrega>();
  private readonly historial: { entregaId: string; estado: string; fecha: Date; observaciones: string | null }[] = [];

  constructor(private readonly movimientos: InMemoryMovimientos) {}

  async findById(id: string): Promise<Entrega | null> {
    const entrega = this.entregas.get(id);
    if (!entrega) return null;
    const confirmacion = this.historial.find((h) => h.entregaId === id && h.estado === 'CONFIRMADO');
    return {
      ...entrega,
      estado: confirmacion ? 'ENTREGADO' : 'PENDIENTE',
      fechaRecepcion: confirmacion?.fecha ?? null,
      observacionesRecepcion: confirmacion?.observaciones ?? null,
    };
  }

  async registrar(entrega: Entrega, _usuario: Usuario): Promise<void> {
    for (const item of entrega.lotes) {
      const disponible = this.movimientos.stock(item.loteId);
      if (item.cantidad > disponible) {
        throw new StockInsuficienteError(item.loteId, disponible, item.cantidad);
      }
    }
    this.entregas.set(entrega.id, entrega);
    for (const item of entrega.lotes) {
      this.movimientos.movimientos.push({ loteId: item.loteId, cantidad: -item.cantidad });
    }
    this.historial.push({ entregaId: entrega.id, estado: 'PENDIENTE', fecha: entrega.fechaEntrega, observaciones: null });
  }

  async registrarConfirmacion(
    entregaId: string,
    _usuario: Usuario,
    fecha: Date,
    observaciones: string | null,
  ): Promise<void> {
    if (this.historial.some((h) => h.entregaId === entregaId && h.estado === 'CONFIRMADO')) {
      throw new EntregaYaConfirmadaError(entregaId);
    }
    this.historial.push({ entregaId, estado: 'CONFIRMADO', fecha, observaciones });
  }
}

// Para que funcione standalone / sin broker externo
export class InMemoryPublicadorDeEntregas implements PublicadorDeEntregas {
  async publicar(_entrega: Entrega) {}
}
