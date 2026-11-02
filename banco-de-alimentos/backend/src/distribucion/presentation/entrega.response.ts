import type { Entrega } from '../domain/entities.js';

// Arma la respuesta con la forma de EntregaResponse del openapi
export function aEntregaResponse(entrega: Entrega) {
  return {
    id: entrega.id,
    depositoId: entrega.depositoId,
    comedorId: entrega.comedorId,
    fechaEntrega: entrega.fechaEntrega.toISOString(),
    estado: entrega.estado,
    lotes: entrega.lotes.map(({ loteId, cantidad }) => ({ loteId, cantidad })),
  };
}
