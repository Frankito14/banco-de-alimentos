import type { UsuarioAutenticado } from './usuario-autenticado.js';
import type { VerificadorDeToken } from './verificador-de-token.js';

// Solo para desarrollo: acepta tokens fijos de usuarios de prueba
export const USUARIOS_DE_PRUEBA: Record<string, UsuarioAutenticado> = {
  'token-voluntario': { id: 'b1f0a8c2-3d4e-4f5a-8b6c-7d8e9f0a1b2c', rol: 'Voluntario' },
  'token-referente': { id: 'c2a1b9d3-4e5f-4a6b-9c7d-8e9f0a1b2c3d', rol: 'ReferenteComedor' },
  'token-coordinador': { id: 'd3b2c0e4-5f6a-4b7c-8d8e-9f0a1b2c3d4e', rol: 'Coordinador' },
};

export class FakeTokenVerifier implements VerificadorDeToken {
  async verificar(token: string) {
    return USUARIOS_DE_PRUEBA[token] ?? null;
  }
}
