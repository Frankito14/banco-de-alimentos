// Roles definidos en el contrato (UsuarioPerfilResponse.rol)
export type Rol = 'Voluntario' | 'ReferenteComedor' | 'Coordinador';

export interface UsuarioAutenticado {
  id: string;
  rol: Rol;
}
