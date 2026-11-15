interface DescripcionRecurso {
  noEncontradoTitulo: string;
  noEncontradoDetalle: string;
  referenciaInvalidaTitulo: string;
  referenciaInvalidaDetalle: string;
}

const DESCRIPCION_RECURSOS: Record<string, DescripcionRecurso> = {
  deposito: {
    noEncontradoTitulo: 'Depósito no encontrado',
    noEncontradoDetalle: 'El depósito seleccionado no existe o no se encuentra disponible.',
    referenciaInvalidaTitulo: 'Depósito no disponible',
    referenciaInvalidaDetalle: 'El depósito seleccionado no existe o ya no está disponible.',
  },
  comedor: {
    noEncontradoTitulo: 'Comedor no encontrado',
    noEncontradoDetalle: 'El comedor seleccionado no se encuentra registrado en el sistema.',
    referenciaInvalidaTitulo: 'Comedor no encontrado',
    referenciaInvalidaDetalle: 'El comedor seleccionado no se encuentra registrado en el sistema.',
  },
  lote: {
    noEncontradoTitulo: 'Lote no encontrado',
    noEncontradoDetalle: 'El lote de alimentos seleccionado no existe o ya no está disponible.',
    referenciaInvalidaTitulo: 'Lote no disponible',
    referenciaInvalidaDetalle: 'Uno de los lotes de alimentos seleccionados no existe o ya no está disponible.',
  },
  entrega: {
    noEncontradoTitulo: 'Entrega no encontrada',
    noEncontradoDetalle: 'No se encontró la entrega solicitada. Es posible que haya sido eliminada o el enlace sea incorrecto.',
    referenciaInvalidaTitulo: 'Entrega inválida',
    referenciaInvalidaDetalle: 'La entrega seleccionada no es válida.',
  },
};

// Errores de negocio que se traducen a 409 Conflict
export abstract class ReglaDeNegocioError extends Error {
  readonly title: string;

  constructor(
    message: string,
    readonly code: string,
    title = 'No se pudo completar la operación',
  ) {
    super(message);
    this.name = new.target.name;
    this.title = title;
  }
}

// Recursos inexistentes, se traducen a 404 Not Found
export class RecursoNoEncontradoError extends Error {
  readonly code: string;
  readonly title: string;

  constructor(recurso: string, _id: string) {
    const desc = DESCRIPCION_RECURSOS[recurso];
    super(desc?.noEncontradoDetalle ?? 'No se encontró el elemento solicitado.');
    this.name = 'RecursoNoEncontradoError';
    this.code = `${recurso}-no-encontrado`;
    this.title = desc?.noEncontradoTitulo ?? 'Elemento no encontrado';
  }
}

// Referencias inválidas, se traducen a 400 Bad Request
export class ReferenciaInvalidaError extends Error {
  readonly code: string;
  readonly title: string;

  constructor(recurso: string, _id: string) {
    const desc = DESCRIPCION_RECURSOS[recurso];
    super(desc?.referenciaInvalidaDetalle ?? 'Alguno de los datos seleccionados ya no está disponible.');
    this.name = 'ReferenciaInvalidaError';
    this.code = `${recurso}-inexistente`;
    this.title = desc?.referenciaInvalidaTitulo ?? 'Selección inválida';
  }
}

