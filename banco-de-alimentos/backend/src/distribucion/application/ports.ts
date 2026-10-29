import type { Comedor, Deposito, Entrega, Lote } from '../domain/entities.js';

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
  save(entrega: Entrega): Promise<void>;
}

export const DEPOSITO_REPOSITORY = Symbol('DepositoRepository');
export const COMEDOR_REPOSITORY = Symbol('ComedorRepository');
export const LOTE_REPOSITORY = Symbol('LoteRepository');
export const ENTREGA_REPOSITORY = Symbol('ENTREGA_REPOSITORY');