export interface EntregaRendicion {
    entregaId: string;
    loteId: string;
    comedorId: string;
    cantidad: number;
    fecha: string;
}

export interface LoteRendicion {
    loteId: string; // id del envío (batch), no confundir con el lote de alimentos
    entregas: EntregaRendicion[];
}

export interface RendicionCuentasPort {
    enviarLote(lote: LoteRendicion): Promise<void>;
}

export const RENDICION_CUENTAS_PORT = 'RENDICION_CUENTAS_PORT';