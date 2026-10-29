// src/padron-provincial/infrastructure/padron-provincial.mapper.ts
import { ComedorHabilitado } from '../domain/comedor-habilitado';

// Formato externo (el del padrón provincial). Ajustar al mock real.
interface ComedorPadronDto {
    codigo: string;
    nombre: string;
    domicilio?: string;
    localidad?: string;
    estado: string; // 'HABILITADO' | 'SUSPENDIDO' | 'BAJA' ...
}

export function toComedoresHabilitados(respuesta: unknown): ComedorHabilitado[] {
    const lista = (respuesta as { comedores?: unknown })?.comedores;
    if (!Array.isArray(lista)) {
        throw new Error('Respuesta del padrón con formato inesperado');
    }

    return (lista as ComedorPadronDto[])
        .filter((c) => c?.codigo && c.estado?.toUpperCase() === 'HABILITADO')
        .map((c) => ({
            id: String(c.codigo),
            nombre: c.nombre,
            direccion: c.domicilio ?? '',
            localidad: c.localidad ?? '',
        }));
}