// src/rendicion-cuentas/infrastructure/envio-nocturno.cron.ts
import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { RendicionCuentasService } from '../rendicion-cuentas.service';

@Injectable()
export class EnvioNocturnoCron {
    constructor(private readonly useCase: RendicionCuentasService) { }

    @Cron('0 2 * * *', { timeZone: 'America/Argentina/Buenos_Aires' })
    async ejecutar() {
        await this.useCase.enviar_entregas_nocturno();
    }
}