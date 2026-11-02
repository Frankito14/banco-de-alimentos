import type { UsuarioAutenticado } from './usuario-autenticado';
import type { VerificadorDeToken } from './verificador-de-token';

const USUARIOS_DE_PRUEBA: Record<string, UsuarioAutenticado> = {
  'token-voluntario': { id: 'usr-voluntario-1', rol: 'Voluntario' },
  'token-referente': { id: 'usr-referente-1', rol: 'ReferenteComedor' },
  'token-coordinador': { id: 'usr-coordinador-1', rol: 'Coordinador' },
};

export class FakeTokenVerifier implements VerificadorDeToken {
  async verificar(token: string) {
    return USUARIOS_DE_PRUEBA[token] ?? null;
  }
}
