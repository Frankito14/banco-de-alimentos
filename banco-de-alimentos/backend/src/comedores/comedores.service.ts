import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../common/database/database.service';
import { ConsultarComedoresHabilitadosUseCase } from '../padron-provincial/application/consultar-comedores-habilitados.use-case';

export interface ComedorResponse {
  id: string;
  nombre: string;
  responsable: string;
  partido: string;
  direccion: string;
  telefono: string;
  capacidadPersonas: number;
  habilitado: boolean;
}

@Injectable()
export class ComedoresService {
  private readonly logger = new Logger(ComedoresService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly padronUseCase: ConsultarComedoresHabilitadosUseCase,
  ) {}

  async obtenerComedores(): Promise<ComedorResponse[]> {
    const mapaComedores = new Map<string, ComedorResponse>();

    // 1. Cargar comedores desde la base de datos PostgreSQL
    try {
      const res = await this.db.query(
        `SELECT id, nombre, responsable, partido, direccion, telefono, 
                capacidad_personas as "capacidadPersonas", habilitado 
         FROM comedores 
         ORDER BY id ASC`,
      );
      for (const row of res.rows) {
        mapaComedores.set(String(row.id), {
          id: String(row.id),
          nombre: row.nombre,
          responsable: row.responsable,
          partido: row.partido,
          direccion: row.direccion,
          telefono: row.telefono,
          capacidadPersonas: Number(row.capacidadPersonas),
          habilitado: Boolean(row.habilitado),
        });
      }
    } catch (err) {
      this.logger.warn(`Error al consultar comedores en PostgreSQL: ${(err as Error).message}`);
    }

    // 2. Consultar sistema externo: Padrón Provincial
    try {
      const snapshot = await this.padronUseCase.obtenerSnapshot();
      for (const ch of snapshot.comedores) {
        const idStr = String(ch.id);
        const existente = mapaComedores.get(idStr);

        if (existente) {
          existente.habilitado = true; // El padrón provincial certifica la habilitación
          existente.nombre = ch.nombre || existente.nombre;
          existente.direccion = ch.direccion || existente.direccion;
          existente.partido = ch.localidad || existente.partido;
        } else {
          mapaComedores.set(idStr, {
            id: idStr,
            nombre: ch.nombre,
            responsable: 'Referente a designar',
            partido: ch.localidad || 'Buenos Aires',
            direccion: ch.direccion,
            telefono: '0800-PADRON-PROV',
            capacidadPersonas: 100,
            habilitado: true,
          });
        }
      }
    } catch (err) {
      this.logger.warn(`Error al consultar Padrón Provincial: ${(err as Error).message}`);
    }

    return Array.from(mapaComedores.values());
  }
}
