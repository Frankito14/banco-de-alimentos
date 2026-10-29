import type { Comedor, Deposito, Entrega, Lote } from '../domain/entities.js';
import type {
  ComedorRepository,
  DepositoRepository,
  EntregaRepository,
  LoteRepository,
} from '../application/ports.js';

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

export class InMemoryLoteRepository implements LoteRepository {
  private readonly datos = new Map<string, Lote>([
    [LOTE_OK, { id: LOTE_OK, depositoId: DEPOSITO_1, stockDisponible: 100, fechaVencimiento: new Date('2030-12-31') }],
  ]);
  async findById(id: string) {
    return this.datos.get(id) ?? null;
  }
  async save(lote: Lote) {
    this.datos.set(lote.id, lote);
  }
}

export class InMemoryEntregaRepository implements EntregaRepository {
  private readonly datos = new Map<string, Entrega>();
  async save(entrega: Entrega) {
    this.datos.set(entrega.id, entrega);
  }
}
