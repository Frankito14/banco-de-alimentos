import { Injectable, Logger } from '@nestjs/common';
import { v5 as uuidv5 } from 'uuid';
import { ConsultarComedoresHabilitadosUseCase } from '../../padron-provincial/application/consultar-comedores-habilitados.use-case';
import { DatabaseService } from '../../common/database/database.service';
import type { Comedor } from '../domain/entities';
import type { ComedorRepository } from '../application/ports';

// Traducción de cada id del padrón a un UUID
const NAMESPACE_PADRON = '6f1c9a52-2b7e-4d3a-9c1e-0a5b8d7e4f21';

export function idDeComedor(padronId: string): string {
  return uuidv5(padronId, NAMESPACE_PADRON);
}

@Injectable()
export class PadronComedorRepository implements ComedorRepository {
  private readonly logger = new Logger(PadronComedorRepository.name);

  constructor(
    private readonly padron: ConsultarComedoresHabilitadosUseCase,
    private readonly db: DatabaseService,
  ) {}

  async findById(id: string): Promise<Comedor | null> {
    // 1. Verificar en sistema externo Padrón Provincial (en cache Redis / HTTP)
    try {
      const { comedores } = await this.padron.obtenerSnapshot();
      const coincide = comedores.some(
        (c) => String(c.id) === String(id) || idDeComedor(String(c.id)) === id,
      );
      if (coincide) {
        return { id, habilitado: true };
      }
    } catch (err) {
      this.logger.warn(`No se pudo verificar comedor en padrón provincial: ${(err as Error).message}`);
    }

    // 2. Si no coincide en el padrón, consultar en base de datos PostgreSQL
    try {
      const res = await this.db.query<{ id: string; habilitado: boolean }>(
        'SELECT id, habilitado FROM comedores WHERE id = $1 LIMIT 1',
        [id],
      );
      if (res.rows.length > 0) {
        return { id: res.rows[0].id, habilitado: Boolean(res.rows[0].habilitado) };
      }
    } catch (err) {
      this.logger.error(`Error al consultar comedor en PostgreSQL: ${(err as Error).message}`);
    }

    // Si no existe en ningún lado
    return null;
  }
}
