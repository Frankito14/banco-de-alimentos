import { Module } from '@nestjs/common';
import {
  COMEDOR_REPOSITORY,
  DEPOSITO_REPOSITORY,
  ENTREGA_REPOSITORY,
  LOTE_REPOSITORY,
  PUBLICADOR_DE_ENTREGAS,
} from './application/ports.js';
import type {
  ComedorRepository,
  DepositoRepository,
  EntregaRepository,
  LoteRepository,
  PublicadorDeEntregas,
} from './application/ports.js';
import { ConfirmarEntrega } from './application/confirmar-entrega.use-case.js';
import { RegistrarEntrega } from './application/registrar-entrega.use-case.js';
import {
  InMemoryComedorRepository,
  InMemoryDepositoRepository,
  InMemoryEntregaRepository,
  InMemoryLoteRepository,
  InMemoryPublicadorDeEntregas,
} from './infrastructure/in-memory.repositories.js';
import { EntregasController } from './presentation/entregas.controller.js';
// Cuando esté RabbitMQ descomentar:
//import { RabbitMqPublicadorDeEntregas } from './infrastructure/......';






@Module({
  controllers: [EntregasController],
  providers: [
    { provide: DEPOSITO_REPOSITORY, useClass: InMemoryDepositoRepository },
    { provide: COMEDOR_REPOSITORY, useClass: InMemoryComedorRepository },
    { provide: LOTE_REPOSITORY, useClass: InMemoryLoteRepository },
    { provide: ENTREGA_REPOSITORY, useClass: InMemoryEntregaRepository },
    // Cuando esté RabbitMQ descomentar:
    // { provide: PUBLICADOR_DE_ENTREGAS, useClass: RabbitMqPublicadorDeEntregas },
    { provide: PUBLICADOR_DE_ENTREGAS, useClass: InMemoryPublicadorDeEntregas },
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
    {
      provide: ConfirmarEntrega,
      useFactory: (e: EntregaRepository, p: PublicadorDeEntregas) => new ConfirmarEntrega(e, p),
      inject: [ENTREGA_REPOSITORY, PUBLICADOR_DE_ENTREGAS],
    },
  ],
})
export class DistribucionModule {}
