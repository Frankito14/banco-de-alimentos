import type { Entrega, Usuario } from '../domain/entities';
import { RecursoNoEncontradoError } from '../domain/errors/domain-error';
import { EntregaYaConfirmadaError } from '../domain/errors/entrega.errors';
import type { EntregaRepository, PublicadorDeEntregas } from './ports';

export class ConfirmarEntrega {
  constructor(
    private readonly entregas: EntregaRepository,
    private readonly publicador: PublicadorDeEntregas,
  ) {}

  async ejecutar(
    entregaId: string,
    usuario: Usuario,
    observaciones?: string | null,
  ): Promise<Entrega> {
    // 404: la entrega tiene que existir
    const entrega = await this.entregas.findById(entregaId);
    if (!entrega) throw new RecursoNoEncontradoError('entrega', entregaId);

    // 409: solo se confirman entregas pendientes
    if (entrega.estado !== 'PENDIENTE') throw new EntregaYaConfirmadaError(entrega.id);

    const fechaRecepcion = new Date();
    const observacionesRecepcion = observaciones?.trim() ? observaciones.trim() : null;

    // La confirmación se agrega al historial de estados: la entrega no se modifica
    await this.entregas.registrarConfirmacion(entrega.id, usuario, fechaRecepcion, observacionesRecepcion);

    const confirmada: Entrega = {
      ...entrega,
      estado: 'ENTREGADO',
      fechaRecepcion,
      observacionesRecepcion,
    };

    await this.publicador.publicar(confirmada);
    return confirmada;
  }
}
