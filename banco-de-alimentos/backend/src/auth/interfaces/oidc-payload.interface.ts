export type Rol = 'Voluntario' | 'ReferenteComedor' | 'Coordinador';

export interface OidcJwtPayload {
  sub: string;              // Subject: ID único del usuario
  email: string;            // Correo del usuario
  nombre: string;           // Nombre completo
  rol: Rol;                 // Rol OIDC para RBAC
  depositoAsignadoId?: string | null;
  comedorAsignadoId?: string | null;
  iss: string;              // Issuer: Proveedor OIDC del Gobierno Provincial
  aud: string;              // Audience: banco-de-alimentos-api
  iat?: number;             // Issued At
  exp?: number;             // Expiration
}

export interface UsuarioOidc {
  id: string;
  nombre: string;
  email: string;
  passwordHash: string;
  rol: Rol;
  depositoAsignadoId?: string | null;
  comedorAsignadoId?: string | null;
}
