import { ReglaDeNegocioError } from './domain-error.js';

export class ComedorNoHabilitadoError extends ReglaDeNegocioError {
  readonly code = 'comedor-no-habilitado';
  constructor(comedorId: string) {
    super(`El comedor ${comedorId} no está habilitado en el padrón provincial`);
  }
}

export class StockInsuficienteError extends ReglaDeNegocioError {
  readonly code = 'stock-insuficiente';
  constructor(loteId: string, disponible: number, pedido: number) {
    super(`El lote ${loteId} tiene ${disponible} disponibles y se pidieron ${pedido}`);
  }
}

export class EntregaYaConfirmadaError extends ReglaDeNegocioError {
  readonly code = 'entrega-ya-confirmada';
  constructor(entregaId: string) {
    super(`La entrega ${entregaId} ya fue confirmada`);
  }
}
