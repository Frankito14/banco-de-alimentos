import { Injectable } from '@nestjs/common';
import { v5 as uuidv5 } from 'uuid';
import { ConsultarComedoresHabilitadosUseCase } from '../../padron-provincial/application/consultar-comedores-habilitados.use-case';
import type { Comedor } from '../domain/entities';
import type { ComedorRepository } from '../application/ports';

// Traducción de cada id del padrón a un UUID
const NAMESPACE_PADRON = '6f1c9a52-2b7e-4d3a-9c1e-0a5b8d7e4f21';

export function idDeComedor(padronId: string): string {
  return uuidv5(padronId, NAMESPACE_PADRON);
}

// Adaptador: Distribución consulta la habilitación a través del módulo del padrón (cache en Redis)
@Injectable()
export class PadronComedorRepository implements ComedorRepository {
  constructor(private readonly padron: ConsultarComedoresHabilitadosUseCase) {}

  async findById(id: string): Promise<Comedor | null> {
    const { comedores } = await this.padron.obtenerSnapshot();
    const habilitado = comedores.some((c) => idDeComedor(c.id) === id);
    // el padrón solo trae habilitados, si no figura, no se le puede entregar
    return { id, habilitado };
  }
}
