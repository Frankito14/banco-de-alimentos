// Errores de negocio que se traducen a 409 Conflict
export abstract class ReglaDeNegocioError extends Error {
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

// Recursos inexistentes, se traducen a 404 Not Found
export class RecursoNoEncontradoError extends Error {
  readonly code: string;

  constructor(recurso: string, id: string) {
    super(`No existe ${recurso} con id ${id}`);
    this.name = 'RecursoNoEncontradoError';
    this.code = `${recurso}-no-encontrado`;
  }
}

// Referencias inválidas, se traducen a 400 Bad Request
export class ReferenciaInvalidaError extends Error {
  readonly code: string;

  constructor(recurso: string, id: string) {
    super(`No existe ${recurso} con id ${id}`);
    this.name = 'ReferenciaInvalidaError';
    this.code = `${recurso}-inexistente`;
  }
}

