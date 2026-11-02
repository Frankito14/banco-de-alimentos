// src/common/redis/redis.module.ts
import { Global, Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const REDIS_CLIENT = 'REDIS_CLIENT';

@Global()
@Module({
    providers: [
        {
            provide: REDIS_CLIENT,
            inject: [ConfigService],
            useFactory: (config: ConfigService) => {
                const logger = new Logger('Redis');
                const url = config.get<string>('REDIS_URL') || 'redis://localhost:6379';
                const client = new Redis(url, {
                    lazyConnect: true,
                    maxRetriesPerRequest: 1,
                    retryStrategy: () => null,
                });
                client.on('error', (err) => logger.warn(`Redis client warning: ${err.message}`));
                return client;
            },
        },
    ],
    exports: [REDIS_CLIENT],
})
export class RedisModule { }
