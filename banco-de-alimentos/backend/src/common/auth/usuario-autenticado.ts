import { Rol } from '../../auth/interfaces/oidc-payload.interface';

export { Rol };

export interface UsuarioAutenticado {
  id: string;
  email?: string;
  nombre?: string;
  rol: Rol;
  depositoAsignadoId?: string | null;
  comedorAsignadoId?: string | null;
}
