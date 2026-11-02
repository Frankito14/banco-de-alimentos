// src/padron-provincial/domain/ports/padron-provincial.port.ts
import { ComedorHabilitado } from '../comedor-habilitado';

export interface PadronProvincialPort {
    obtenerComedoresHabilitados(): Promise<ComedorHabilitado[]>;
}

export const PADRON_PROVINCIAL_PORT = 'PADRON_PROVINCIAL_PORT';