import type { UsuarioAutenticado } from './usuario-autenticado';

export interface VerificadorDeToken {
  verificar(token: string): Promise<UsuarioAutenticado | null>;
}

export const VERIFICADOR_DE_TOKEN = Symbol('VerificadorDeToken');
