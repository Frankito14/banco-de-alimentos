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
                const client = new Redis(config.getOrThrow<string>('REDIS_URL'));
                client.on('error', (err) => logger.error(err.message));
                return client;
            },
        },
    ],
    exports: [REDIS_CLIENT],
})
export class RedisModule { }