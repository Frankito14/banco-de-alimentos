// src/rendicion-cuentas/infrastructure/rendicion-cuentas.http-client.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  LoteRendicion,
  RendicionCuentasPort,
} from '../dto/rendicion-cuentas.dto';
import { toMinisterioPayload } from './rendicion.cuenta.acl';

@Injectable()
export class RendicionCuentasHttpClient implements RendicionCuentasPort {
  private readonly logger = new Logger(RendicionCuentasHttpClient.name);
  private readonly baseUrl: string;
  private readonly timeoutMs = 30_000;
  private readonly maxIntentos = 3;

  constructor(config: ConfigService) {
    this.baseUrl = config.getOrThrow<string>('RENDICION_CUENTAS_URL');
  }

  async enviarLote(lote: LoteRendicion): Promise<void> {
    const body = JSON.stringify(toMinisterioPayload(lote));
    let ultimoError: unknown;

    for (let intento = 1; intento <= this.maxIntentos; intento++) {
      try {
        const res = await fetch(`${this.baseUrl}/lotes`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': lote.loteId, // permite al Ministerio ignorar reenvíos
          },
          body,
          signal: AbortSignal.timeout(this.timeoutMs),
        });

        if (res.ok) return;

        // 4xx: error nuestro, reintentar no sirve
        if (res.status >= 400 && res.status < 500) {
          throw new NoReintentableError(
            `El Ministerio rechazó el lote (HTTP ${res.status})`,
          );
        }
        throw new Error(`HTTP ${res.status}`);
      } catch (err) {
        if (err instanceof NoReintentableError) throw err;
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
      `No se pudo enviar el lote ${lote.loteId}: ${(ultimoError as Error)?.message}`,
    );
  }
}

class NoReintentableError extends Error { }