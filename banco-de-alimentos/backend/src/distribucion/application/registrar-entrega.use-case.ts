import { randomUUID } from 'node:crypto';
import type { Entrega, ItemEntrega, Usuario } from '../domain/entities';
import { ReferenciaInvalidaError } from '../domain/errors/domain-error';
import {
  ComedorNoHabilitadoError,
  StockInsuficienteError,
} from '../domain/errors/entrega.errors';
import type {
  ComedorRepository,
  DepositoRepository,
  EntregaRepository,
  LoteRepository,
} from './ports';

export interface RegistrarEntregaInput {
  depositoId: string;
  comedorId: string;
  lotes: ItemEntrega[];
  usuario: Usuario;
  observaciones?: string;
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
    if (!comedor.habilitado) throw new ComedorNoHabilitadoError(comedor.id, comedor.nombre);

    // Si el mismo lote viene más de una vez, se valida contra la cantidad total pedida
    const totalPorLote = new Map<string, number>();
    for (const item of input.lotes) {
      totalPorLote.set(item.loteId, (totalPorLote.get(item.loteId) ?? 0) + item.cantidad);
    }

    for (const [loteId, cantidad] of totalPorLote) {
      const lote = await this.lotes.findById(loteId);
      if (!lote) throw new ReferenciaInvalidaError('lote', loteId);

      // regla 2: no superar el stock del lote (el repositorio lo vuelve a verificar
      // dentro de la transacción, con el lote bloqueado)
      if (cantidad > lote.stockDisponible) {
        throw new StockInsuficienteError(
          lote.id,
          lote.stockDisponible,
          cantidad,
          lote.alimento,
          lote.codigoLote,
          lote.unidadMedida,
        );
      }
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
      fechaEntrega: new Date(),
      fechaRecepcion: null,
      creadoPor: input.usuario.nombre,
      creadoPorId: input.usuario.id,
      observaciones: input.observaciones?.trim() ? input.observaciones.trim() : null,
    };

    // Solo inserciones: entrega, lotes, movimientos de stock y estado PENDIENTE
    await this.entregas.registrar(entrega, input.usuario);
    return entrega;
  }
}
