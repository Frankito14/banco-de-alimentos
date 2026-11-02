import { ReglaDeNegocioError } from './domain-error';

export class ComedorNoHabilitadoError extends ReglaDeNegocioError {
  constructor(comedorId: string) {
    super(
      `El comedor ${comedorId} no se encuentra habilitado para recibir entregas.`,
      'comedor-no-habilitado',
    );
  }
}

export class StockInsuficienteError extends ReglaDeNegocioError {
  constructor(loteId: string, disponible: number, solicitado: number) {
    super(
      `Stock insuficiente para el lote ${loteId}: disponible ${disponible}, solicitado ${solicitado}.`,
      'stock-insuficiente',
    );
  }
}

export class EntregaYaConfirmadaError extends ReglaDeNegocioError {
  constructor(entregaId: string) {
    super(
      `La entrega ${entregaId} ya fue confirmada previamente.`,
      'entrega-ya-confirmada',
    );
  }
}
