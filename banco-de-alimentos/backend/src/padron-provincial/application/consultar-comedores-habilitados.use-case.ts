// src/padron-provincial/application/consultar-comedores-habilitados.use-case.ts
import {
    Inject,
    Injectable,
    ServiceUnavailableException,
} from '@nestjs/common';
import { PadronSnapshot } from '../domain/comedor-habilitado';
import {
    PADRON_CACHE_PORT,
    PadronCachePort,
} from '../domain/ports/padron-cache.port';
import { SincronizarPadronUseCase } from './sincronizar-padron.use-case';

@Injectable()
export class ConsultarComedoresHabilitadosUseCase {
    constructor(
        @Inject(PADRON_CACHE_PORT) private readonly cache: PadronCachePort,
        private readonly sincronizar: SincronizarPadronUseCase,
    ) { }

    async obtenerSnapshot(): Promise<PadronSnapshot> {
        let snapshot = await this.cache.obtener();

        // Cache vacía (primer arranque o TTL vencido): un intento de sync
        if (!snapshot && (await this.sincronizar.ejecutar())) {
            snapshot = await this.cache.obtener();
        }

        if (!snapshot) {
            throw new ServiceUnavailableException(
                'El padrón provincial no está disponible y no hay datos en cache',
            );
        }
        return snapshot;
    }

    async estaHabilitado(comedorId: string): Promise<boolean> {
        const { comedores } = await this.obtenerSnapshot();
        return comedores.some((c) => c.id === comedorId);
    }
}