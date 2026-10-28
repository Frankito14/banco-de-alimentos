export type Rol = 'Voluntario' | 'ReferenteComedor' | 'Coordinador';

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
  depositoAsignadoId?: string | null;
  comedorAsignadoId?: string | null;
}

export interface LoginResponse {
  token: string;
  tokenType: string;
  expiresIn: number;
  usuario: Usuario;
}

export interface ProblemDetails {
  type?: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  invalidParams?: Array<{ name: string; reason: string }>;
}

export interface Deposito {
  id: string;
  nombre: string;
  direccion: string;
  localidad: string;
  capacidadTotal: number;
}

export interface Lote {
  id: string;
  depositoId: string;
  alimento: string;
  codigoLote: string;
  stockDisponible: number;
  unidadMedida: string;
  fechaVencimiento: string;
  donanteOrigen: string;
}

export interface Comedor {
  id: string;
  nombre: string;
  responsable: string;
  partido: string;
  direccion: string;
  telefono: string;
  capacidadPersonas: number;
  habilitado: boolean;
}

export interface ItemEntregaRequest {
  loteId: string;
  cantidad: number;
}

export interface ItemEntrega {
  loteId: string;
  alimento: string;
  codigoLote: string;
  cantidad: number;
  unidadMedida: string;
}

export interface Entrega {
  id: string;
  depositoId: string;
  depositoNombre?: string;
  comedorId: string;
  comedorNombre: string;
  estado: 'PENDIENTE' | 'ENTREGADO' | 'CANCELADO';
  fechaCreacion: string;
  fechaRecepcion?: string | null;
  horarioRecepcion?: string | null;
  createdBy: string;
  items: ItemEntrega[];
  observaciones?: string;
}
