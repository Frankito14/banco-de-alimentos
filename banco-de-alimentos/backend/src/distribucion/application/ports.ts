import type { Comedor, Deposito, Entrega, Lote, Usuario } from '../domain/entities';

export interface DepositoRepository {
  findById(id: string): Promise<Deposito | null>;
}

export interface ComedorRepository {
  findById(id: string): Promise<Comedor | null>;
}

export interface LoteRepository {
  findById(id: string): Promise<Lote | null>;
}

export interface EntregaRepository {
  findById(id: string): Promise<Entrega | null>;

  /**
   * Registra una entrega nueva en una única transacción: la entrega, sus lotes,
   * un movimiento de stock negativo por cada lote y el estado inicial PENDIENTE.
   * Vuelve a verificar el stock con los lotes bloqueados, para que dos entregas
   * simultáneas no puedan dejar un lote con stock negativo.
   * Solo inserta registros: no modifica ni borra nada.
   */
  registrar(entrega: Entrega, usuario: Usuario): Promise<void>;

  /**
   * Registra la confirmación de recepción como un registro nuevo en el historial
   * de estados de la entrega. No modifica la entrega.
   */
  registrarConfirmacion(
    entregaId: string,
    usuario: Usuario,
    fecha: Date,
    observaciones: string | null,
  ): Promise<void>;
}

// Cola de mensajes (RabbitMQ)
export interface PublicadorDeEntregas {
  publicar(entrega: Entrega): Promise<void>;
}

export const DEPOSITO_REPOSITORY = Symbol('DepositoRepository');
export const COMEDOR_REPOSITORY = Symbol('ComedorRepository');
export const LOTE_REPOSITORY = Symbol('LoteRepository');
export const ENTREGA_REPOSITORY = Symbol('ENTREGA_REPOSITORY');
export const PUBLICADOR_DE_ENTREGAS = Symbol('PublicadorDeEntregas');
