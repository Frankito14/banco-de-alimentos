// src/padron-provincial/application/sincronizar-padron.use-case.ts
import { Inject, Injectable, Logger } from '@nestjs/common';
import {
    PADRON_CACHE_PORT,
    PadronCachePort,
} from '../domain/ports/padron-cache.port';
import {
    PADRON_PROVINCIAL_PORT,
    PadronProvincialPort,
} from '../domain/ports/padron-provincial.port';

@Injectable()
export class SincronizarPadronUseCase {
    private readonly logger = new Logger(SincronizarPadronUseCase.name);

    constructor(
        @Inject(PADRON_PROVINCIAL_PORT) private readonly padron: PadronProvincialPort,
        @Inject(PADRON_CACHE_PORT) private readonly cache: PadronCachePort,
    ) { }

    /** Devuelve true si logró sincronizar. Nunca lanza: si falla, la cache anterior se conserva. */
    async ejecutar(): Promise<boolean> {
        try {
            const comedores = await this.padron.obtenerComedoresHabilitados();
            await this.cache.guardar({
                sincronizadoAt: new Date().toISOString(),
                comedores,
            });
            this.logger.log(`Padrón sincronizado: ${comedores.length} comedores habilitados`);
            return true;
        } catch (err) {
            this.logger.error(
                `Falló la sincronización del padrón, se mantiene la cache anterior: ${(err as Error).message}`,
            );
            return false;
        }
    }
}