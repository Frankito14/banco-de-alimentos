import { ReglaDeNegocioError } from './domain-error';

export class ComedorNoHabilitadoError extends ReglaDeNegocioError {
  constructor(_comedorId: string, nombreComedor?: string) {
    const detalle = nombreComedor
      ? `No se puede registrar la entrega porque el comedor "${nombreComedor}" no se encuentra habilitado actualmente en el Padrón Provincial.`
      : 'No se puede registrar la entrega porque el comedor seleccionado no se encuentra habilitado actualmente en el Padrón Provincial.';
    super(detalle, 'comedor-no-habilitado', 'Comedor no habilitado');
  }
}

export class StockInsuficienteError extends ReglaDeNegocioError {
  constructor(
    _loteId: string,
    disponible: number,
    solicitado: number,
    alimento?: string,
    codigoLote?: string,
    unidadMedida = 'unidades',
  ) {
    const descripcion = alimento
      ? codigoLote
        ? `"${alimento}" (Lote ${codigoLote})`
        : `"${alimento}"`
      : 'el alimento seleccionado';
    super(
      `No hay suficiente stock para ${descripcion}: solicitaste ${solicitado} ${unidadMedida} y hay ${disponible} ${unidadMedida} disponibles.`,
      'stock-insuficiente',
      'Stock insuficiente',
    );
  }
}

export class EntregaYaConfirmadaError extends ReglaDeNegocioError {
  constructor(_entregaId: string) {
    super(
      'Esta entrega ya fue confirmada y recepcionada anteriormente.',
      'entrega-ya-confirmada',
      'Entrega ya confirmada',
    );
  }
}
