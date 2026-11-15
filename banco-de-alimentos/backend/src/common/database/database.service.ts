// src/common/database/database.service.ts
import { Injectable, Inject, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { DATABASE_POOL } from './database.constants';
import { INITIAL_SCHEMA_AND_SEED } from './database.seed';

@Injectable()
export class DatabaseService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);

  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async onApplicationBootstrap() {
    await this.seedDatabase();
  }

  async onModuleDestroy() {
    await this.pool.end();
  }

  async query<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
    return this.pool.query<T>(text, params);
  }

  /**
   * Ejecuta varias consultas en una única transacción ACID.
   * Si la función lanza un error, se hace ROLLBACK y no queda ningún cambio a medias.
   */
  async transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const resultado = await fn(client);
      await client.query('COMMIT');
      return resultado;
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  async seedDatabase(): Promise<void> {
    try {
      this.logger.log('Inicializando esquema y seeds en PostgreSQL...');
      await this.pool.query(INITIAL_SCHEMA_AND_SEED);
      this.logger.log('Base de datos PostgreSQL inicializada con éxito.');
    } catch (error) {
      this.logger.error(`Error al ejecutar seed inicial en PostgreSQL: ${(error as Error).message}`, (error as Error).stack);
    }
  }
}
