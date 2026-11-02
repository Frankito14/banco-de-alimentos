// src/padron-provincial/infrastructure/padron-redis.cache.ts
import { Inject, Injectable } from '@nestjs/common';
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
    constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) { }

    async guardar(snapshot: PadronSnapshot): Promise<void> {
        await this.redis.set(KEY, JSON.stringify(snapshot), 'EX', TTL_SEGUNDOS);
    }

    async obtener(): Promise<PadronSnapshot | null> {
        const raw = await this.redis.get(KEY);
        return raw ? (JSON.parse(raw) as PadronSnapshot) : null;
    }
}