export type EstadoEntrega = 'PENDIENTE' | 'ENTREGADO' | 'CANCELADO';

// Quién realiza una operación (datos del token OIDC)
export interface Usuario {
  id: string; // claim "sub": identificador único y estable del usuario
  nombre: string; // nombre visible al momento de la operación
}

export interface Deposito {
  id: string;
  nombre?: string;
}

export interface Comedor {
  id: string;
  nombre?: string;
  habilitado: boolean;
}

export interface Lote {
  id: string;
  depositoId: string;
  alimento?: string;
  codigoLote?: string;
  unidadMedida?: string;
  // Calculado como la suma de los movimientos de stock del lote (no se guarda)
  stockDisponible: number;
  fechaVencimiento: Date;
}

export interface ItemEntrega {
  loteId: string;
  cantidad: number;
}

// Registro por cada lote incluido en la entrega
export interface LoteEntregado {
  id: string;
  loteId: string;
  cantidad: number;
}

export interface Entrega {
  id: string;
  depositoId: string;
  comedorId: string;
  lotes: LoteEntregado[];
  // Estado actual: se deduce del último registro del historial de estados
  estado: EstadoEntrega;
  fechaEntrega: Date;
  fechaRecepcion: Date | null;
  creadoPor: string; // nombre de quien registró la entrega
  creadoPorId?: string; // id (sub) de quien registró la entrega
  observaciones?: string | null; // observaciones del registro de la entrega
  observacionesRecepcion?: string | null; // observaciones de la confirmación de recepción
}
