// src/padron-provincial/infrastructure/padron-provincial.redis.cache.ts
import { Inject, Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../../common/redis/redis.module';
import { PadronSnapshot } from '../domain/comedor-habilitado';
import { PadronCachePort } from '../domain/ports/padron-provincial.cache.port';

const KEY = 'padron:comedores-habilitados';
// TTL mucho mayor al intervalo de sync (1h): si el padrón se cae,
// seguimos sirviendo el último dato conocido durante 24h.
const TTL_SEGUNDOS = 24 * 60 * 60;

@Injectable()
export class PadronRedisCache implements PadronCachePort {
    private readonly logger = new Logger(PadronRedisCache.name);

    constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) { }

    async guardar(snapshot: PadronSnapshot): Promise<void> {
        try {
            await this.redis.set(KEY, JSON.stringify(snapshot), 'EX', TTL_SEGUNDOS);
        } catch (err) {
            this.logger.warn(`No se pudo persistir padrón en Redis: ${(err as Error).message}`);
        }
    }

    async obtener(): Promise<PadronSnapshot | null> {
        try {
            const raw = await this.redis.get(KEY);
            return raw ? (JSON.parse(raw) as PadronSnapshot) : null;
        } catch (err) {
            this.logger.warn(`No se pudo leer padrón de Redis: ${(err as Error).message}`);
            return null;
        }
    }
}
