import { randomUUID } from 'node:crypto';
import type { Entrega, ItemEntrega, Lote } from '../domain/entities.js';
import { ReferenciaInvalidaError } from '../domain/errors/domain-error.js';
import {
  ComedorNoHabilitadoError,
  StockInsuficienteError,
} from '../domain/errors/entrega.errors.js';
import type {
  ComedorRepository,
  DepositoRepository,
  EntregaRepository,
  LoteRepository,
} from './ports.js';

export interface RegistrarEntregaInput {
  depositoId: string;
  comedorId: string;
  lotes: ItemEntrega[];
  creadoPor: string;
}

export class RegistrarEntrega {
  constructor(
    private readonly depositos: DepositoRepository,
    private readonly comedores: ComedorRepository,
    private readonly lotes: LoteRepository,
    private readonly entregas: EntregaRepository,
  ) {}

  async ejecutar(input: RegistrarEntregaInput): Promise<Entrega> {
    // 400: los recursos tienen que existir
    const deposito = await this.depositos.findById(input.depositoId);
    if (!deposito) throw new ReferenciaInvalidaError('deposito', input.depositoId);

    const comedor = await this.comedores.findById(input.comedorId);
    if (!comedor) throw new ReferenciaInvalidaError('comedor', input.comedorId);

    // 409: regla de negocio 1, solo comedores habilitados
    if (!comedor.habilitado) throw new ComedorNoHabilitadoError(comedor.id);

    const ahora = new Date();
    const lotesConDescuento: Lote[] = [];
    for (const item of input.lotes) {
      const lote = await this.lotes.findById(item.loteId);
      if (!lote) throw new ReferenciaInvalidaError('lote', item.loteId);

      // regla 2: no superar el stock del lote
      if (item.cantidad > lote.stockDisponible) {
        throw new StockInsuficienteError(lote.id, lote.stockDisponible, item.cantidad);
      }
      lotesConDescuento.push({ ...lote, stockDisponible: lote.stockDisponible - item.cantidad });
    }

    const entrega: Entrega = {
      id: randomUUID(),
      depositoId: deposito.id,
      comedorId: comedor.id,
      lotes: input.lotes.map((item) => ({
        id: randomUUID(),
        loteId: item.loteId,
        cantidad: item.cantidad,
      })),
      estado: 'PENDIENTE',
      fechaEntrega: ahora,
      fechaRecepcion: null,
      creadoPor: input.creadoPor,
    };

    // el stock se descuenta cuando todos los lotes pasaron las validaciones
    for (const lote of lotesConDescuento) await this.lotes.save(lote);
    await this.entregas.save(entrega);
    return entrega;
  }
}