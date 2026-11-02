export interface ComedorHabilitado {
    id: string;
    nombre: string;
    direccion: string;
    localidad: string;
}

export interface PadronSnapshot {
    sincronizadoAt: string; // ISO: cuándo se sincronizó el padrón
    comedores: ComedorHabilitado[];
}