// src/padron-provincial/infrastructure/sincronizar-padron.cron.ts
import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SincronizarPadronUseCase } from '../sincronizar-padron.use-case';

@Injectable()
export class SincronizarPadronCron implements OnApplicationBootstrap {
    constructor(private readonly useCase: SincronizarPadronUseCase) { }

    // Carga inicial sin bloquear el arranque (la API es lenta)
    onApplicationBootstrap() {
        void this.useCase.ejecutar();
    }

    @Cron('0 * * * *', { timeZone: 'America/Argentina/Buenos_Aires' })
    async sincronizar() {
        await this.useCase.ejecutar();
    }
}