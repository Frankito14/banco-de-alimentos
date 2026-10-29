import { Module } from '@nestjs/common';

import { RendicionCuentasHttpClient } from './infrastructure/rendicion-cuentas.http-client';
import { RendicionCuentasService } from './rendicion-cuentas.service';
import { EnvioNocturnoCron } from './infrastructure/envio-nocturno.cron';

@Module({
    providers: [
        RendicionCuentasService,
        EnvioNocturnoCron,
        { provide: 'RendicionCuentasPort', useClass: RendicionCuentasHttpClient },
    ],
})
export class RendicionCuentasModule { }
