import { Module } from '@nestjs/common';
import {
  COMEDOR_REPOSITORY,
  DEPOSITO_REPOSITORY,
  ENTREGA_REPOSITORY,
  LOTE_REPOSITORY,
} from './application/ports.js';
import type {
  ComedorRepository,
  DepositoRepository,
  EntregaRepository,
  LoteRepository,
} from './application/ports.js';
import { RegistrarEntrega } from './application/registrar-entrega.use-case.js';
import {
  InMemoryComedorRepository,
  InMemoryDepositoRepository,
  InMemoryEntregaRepository,
  InMemoryLoteRepository,
} from './infrastructure/in-memory.repositories.js';
import { EntregasController } from './presentation/entregas.controller.js';

@Module({
  controllers: [EntregasController],
  providers: [
    { provide: DEPOSITO_REPOSITORY, useClass: InMemoryDepositoRepository },
    { provide: COMEDOR_REPOSITORY, useClass: InMemoryComedorRepository },
    { provide: LOTE_REPOSITORY, useClass: InMemoryLoteRepository },
    { provide: ENTREGA_REPOSITORY, useClass: InMemoryEntregaRepository },
    {
      provide: RegistrarEntrega,
      useFactory: (
        d: DepositoRepository,
        c: ComedorRepository,
        l: LoteRepository,
        e: EntregaRepository,
      ) => new RegistrarEntrega(d, c, l, e),
      inject: [DEPOSITO_REPOSITORY, COMEDOR_REPOSITORY, LOTE_REPOSITORY, ENTREGA_REPOSITORY],
    },
  ],
})
export class DistribucionModule {}
