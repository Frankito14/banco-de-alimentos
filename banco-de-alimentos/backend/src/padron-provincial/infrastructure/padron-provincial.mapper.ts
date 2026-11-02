// src/padron-provincial/infrastructure/padron-provincial.mapper.ts
import { ComedorHabilitado } from '../domain/comedor-habilitado';

interface ComedorPadronDto {
    id?: number | string;
    codigo?: string;
    nombre: string;
    domicilio?: string;
    direccion?: string;
    localidad?: string;
    provincia?: string;
    estado?: string;
}

export function toComedoresHabilitados(respuesta: unknown): ComedorHabilitado[] {
    const lista = Array.isArray(respuesta)
        ? respuesta
        : (respuesta as { comedores?: unknown })?.comedores;

    if (!Array.isArray(lista)) {
        throw new Error('Respuesta del padrón con formato inesperado');
    }

    return (lista as ComedorPadronDto[])
        .filter((c) => {
            const id = c?.id ?? c?.codigo;
            if (!id) return false;
            if (c.estado && c.estado.toUpperCase() !== 'HABILITADO') return false;
            return true;
        })
        .map((c) => ({
            id: String(c.id ?? c.codigo),
            nombre: c.nombre,
            direccion: c.direccion ?? c.domicilio ?? '',
            localidad: c.localidad ?? c.provincia ?? '',
        }));
}
