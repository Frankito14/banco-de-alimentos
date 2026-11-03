// src/padron-provincial/application/sincronizar-padron.use-case.ts
import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import {
    PADRON_CACHE_PORT,
    PadronCachePort,
} from '../domain/ports/padron-provincial.cache.port';
import {
    PADRON_PROVINCIAL_PORT,
    PadronProvincialPort,
} from '../domain/ports/padron-provincial.port';
import { DatabaseService } from '../../common/database/database.service';

@Injectable()
export class SincronizarPadronUseCase {
    private readonly logger = new Logger(SincronizarPadronUseCase.name);

    constructor(
        @Inject(PADRON_PROVINCIAL_PORT) private readonly padron: PadronProvincialPort,
        @Inject(PADRON_CACHE_PORT) private readonly cache: PadronCachePort,
        @Optional() private readonly db?: DatabaseService,
    ) { }

    /** Devuelve true si logró sincronizar. Nunca lanza: si falla, la cache anterior se conserva. */
    async ejecutar(): Promise<boolean> {
        try {
            const comedores = await this.padron.obtenerComedoresHabilitados();
            await this.cache.guardar({
                sincronizadoAt: new Date().toISOString(),
                comedores,
            });

            // Sincronizar también con la base de datos PostgreSQL
            if (this.db) {
                for (const c of comedores) {
                    await this.db.query(
                        `INSERT INTO comedores (id, nombre, direccion, partido, responsable, telefono, capacidad_personas, habilitado)
                         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                         ON CONFLICT (id) DO UPDATE SET
                           nombre = EXCLUDED.nombre,
                           direccion = EXCLUDED.direccion,
                           habilitado = EXCLUDED.habilitado`,
                        [
                            String(c.id),
                            c.nombre,
                            c.direccion,
                            c.localidad || 'Buenos Aires',
                            'Referente Comedor',
                            '0800-PADRON-PROV',
                            100,
                            true,
                        ]
                    ).catch((dbErr) => {
                        this.logger.warn(`No se pudo sincronizar comedor ${c.id} en PostgreSQL: ${(dbErr as Error).message}`);
                    });
                }
            }

            this.logger.log(`Padrón sincronizado: ${comedores.length} comedores habilitados (Redis + PostgreSQL)`);
            return true;
        } catch (err) {
            this.logger.error(
                `Falló la sincronización del padrón, se mantiene la cache anterior: ${(err as Error).message}`,
            );
            return false;
        }
    }
}
