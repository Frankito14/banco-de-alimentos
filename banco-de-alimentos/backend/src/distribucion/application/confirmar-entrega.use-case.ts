import type { Entrega } from '../domain/entities.js';
import { RecursoNoEncontradoError } from '../domain/errors/domain-error.js';
import { EntregaYaConfirmadaError } from '../domain/errors/entrega.errors.js';
import type { EntregaRepository, PublicadorDeEntregas } from './ports.js';

export class ConfirmarEntrega {
  constructor(
    private readonly entregas: EntregaRepository,
    private readonly publicador: PublicadorDeEntregas,
  ) {}

  async ejecutar(entregaId: string): Promise<Entrega> {
    // 404: la entrega tiene que existir
    const entrega = await this.entregas.findById(entregaId);
    if (!entrega) throw new RecursoNoEncontradoError('entrega', entregaId);

    // 409: solo se confirman entregas pendientes
    if (entrega.estado !== 'PENDIENTE') throw new EntregaYaConfirmadaError(entrega.id);

    const confirmada: Entrega = {
      ...entrega,
      estado: 'ENTREGADO',
      fechaRecepcion: new Date(),
    };

    await this.entregas.save(confirmada);
    await this.publicador.publicar(confirmada);
    return confirmada;
  }
}
