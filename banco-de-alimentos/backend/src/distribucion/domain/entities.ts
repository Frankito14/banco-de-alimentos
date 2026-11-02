export type EstadoEntrega = 'PENDIENTE' | 'ENTREGADO' | 'CANCELADO';

export interface Deposito {
  id: string;
}

export interface Comedor {
  id: string;
  habilitado: boolean;
}

export interface Lote {
  id: string;
  depositoId: string;
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
  estado: EstadoEntrega;
  fechaEntrega: Date; 
  fechaRecepcion: Date | null; 
  creadoPor: string; 
}