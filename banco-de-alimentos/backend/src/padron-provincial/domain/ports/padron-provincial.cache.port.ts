import { PadronSnapshot } from '../comedor-habilitado';

export interface PadronCachePort {
  guardar(snapshot: PadronSnapshot): Promise<void>;
  obtener(): Promise<PadronSnapshot | null>;
}

export const PADRON_CACHE_PORT = 'PADRON_CACHE_PORT';