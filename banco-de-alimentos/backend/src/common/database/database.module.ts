// src/common/database/database.module.ts
import { Global, Module, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { DatabaseService } from './database.service';
import { DATABASE_POOL } from './database.constants';

export { DATABASE_POOL };

@Global()
@Module({
  providers: [
    {
      provide: DATABASE_POOL,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const logger = new Logger('PostgreSQL');
        const pool = new Pool({
          host: config.get<string>('DB_HOST', 'localhost'),
          port: Number(config.get<number>('DB_PORT', 5432)),
          user: config.get<string>('DB_USER', 'postgres'),
          password: config.get<string>('DB_PASSWORD', 'postgres'),
          database: config.get<string>('DB_NAME', 'banco_alimentos_db'),
          max: 10,
          idleTimeoutMillis: 30000,
        });

        pool.on('error', (err) => {
          logger.error(`Error inesperado en cliente inactivo de PostgreSQL: ${err.message}`);
        });

        return pool;
      },
    },
    DatabaseService,
  ],
  exports: [DATABASE_POOL, DatabaseService],
})
export class DatabaseModule {}
