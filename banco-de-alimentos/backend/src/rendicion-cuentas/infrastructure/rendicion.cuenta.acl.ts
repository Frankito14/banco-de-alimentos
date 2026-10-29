import { LoteRendicion } from '../dto/rendicion-cuentas.dto';

// Falta traducur lo que trae la otra API
export function toMinisterioPayload(lote: LoteRendicion) {
    return {
        id_envio: lote.loteId,
        fecha_envio: new Date().toISOString(),
        entregas: lote.entregas.map((e) => ({
            id_entrega: e.entregaId,
            id_lote_alimento: e.loteId,
            id_comedor: e.comedorId,
            cantidad: e.cantidad,
            fecha_entrega: e.fecha,
        })),
    };
}