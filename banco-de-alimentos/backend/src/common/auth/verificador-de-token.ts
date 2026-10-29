import type { UsuarioAutenticado } from './usuario-autenticado.js';

// valida el token del Firebase y devuelve el usuario
export interface VerificadorDeToken {
  verificar(token: string): Promise<UsuarioAutenticado | null>;
}

export const VERIFICADOR_DE_TOKEN = Symbol('VerificadorDeToken');
