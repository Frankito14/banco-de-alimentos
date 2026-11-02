// src/padron-provincial/infrastructure/padron-provincial.http-client.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ComedorHabilitado } from '../domain/comedor-habilitado';
import { PadronProvincialPort } from '../domain/ports/padron-provincial.port';
import { toComedoresHabilitados } from './padron-provincial.mapper';

@Injectable()
export class PadronProvincialHttpClient implements PadronProvincialPort {
    private readonly logger = new Logger(PadronProvincialHttpClient.name);
    private readonly baseUrl: string;
    private readonly timeoutMs = 15_000; // la API es lenta
    private readonly maxIntentos = 3;

    constructor(config: ConfigService) {
        this.baseUrl = config.getOrThrow<string>('PADRON_PROVINCIAL_URL');
    }

    async obtenerComedoresHabilitados(): Promise<ComedorHabilitado[]> {
        let ultimoError: unknown;

        for (let intento = 1; intento <= this.maxIntentos; intento++) {
            try {
                const res = await fetch(`${this.baseUrl}/comedores`, {
                    headers: { Accept: 'application/json' },
                    signal: AbortSignal.timeout(this.timeoutMs),
                });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);

                return toComedoresHabilitados(await res.json());
            } catch (err) {
                ultimoError = err;
                this.logger.warn(
                    `Intento ${intento}/${this.maxIntentos} falló: ${(err as Error).message}`,
                );
                if (intento < this.maxIntentos) {
                    await new Promise((r) => setTimeout(r, 2000 * intento));
                }
            }
        }

        throw new Error(
            `Padrón provincial no disponible: ${(ultimoError as Error)?.message}`,
        );
    }
}