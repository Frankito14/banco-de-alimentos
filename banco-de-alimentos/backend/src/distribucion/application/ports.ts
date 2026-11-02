import type { Comedor, Deposito, Entrega, Lote } from '../domain/entities';

export interface DepositoRepository {
  findById(id: string): Promise<Deposito | null>;
}

export interface ComedorRepository {
  findById(id: string): Promise<Comedor | null>;
}

export interface LoteRepository {
  findById(id: string): Promise<Lote | null>;
  save(lote: Lote): Promise<void>;
}

export interface EntregaRepository {
  findById(id: string): Promise<Entrega | null>;
  save(entrega: Entrega): Promise<void>;
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
