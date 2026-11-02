// src/padron-provincial/padron-provincial.module.ts
import { Module } from '@nestjs/common';
import { ConsultarComedoresHabilitadosUseCase } from './application/consultar-comedores-habilitados.use-case';
import { SincronizarPadronUseCase } from './application/sincronizar-padron.use-case';
import { PADRON_CACHE_PORT } from './domain/ports/padron-provincial.cache.port';
import { PADRON_PROVINCIAL_PORT } from './domain/ports/padron-provincial.port';
import { PadronProvincialHttpClient } from './infrastructure/padron-provincial.http-client';
import { PadronRedisCache } from './infrastructure/padron-provincial.redis.cache';
import { SincronizarPadronCron } from './infrastructure/sicronizar-padron.cron';

@Module({
    providers: [
        SincronizarPadronUseCase,
        ConsultarComedoresHabilitadosUseCase,
        SincronizarPadronCron,
        { provide: PADRON_PROVINCIAL_PORT, useClass: PadronProvincialHttpClient },
        { provide: PADRON_CACHE_PORT, useClass: PadronRedisCache },
    ],
    exports: [ConsultarComedoresHabilitadosUseCase], // lo único que ven los demás módulos
})
export class PadronProvincialModule { }