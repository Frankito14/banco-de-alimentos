import { Module } from '@nestjs/common';
import {
  COMEDOR_REPOSITORY,
  DEPOSITO_REPOSITORY,
  ENTREGA_REPOSITORY,
  LOTE_REPOSITORY,
  PUBLICADOR_DE_ENTREGAS,
} from './application/ports';
import type {
  ComedorRepository,
  DepositoRepository,
  EntregaRepository,
  LoteRepository,
  PublicadorDeEntregas,
} from './application/ports';
import { ConfirmarEntrega } from './application/confirmar-entrega.use-case';
import { RegistrarEntrega } from './application/registrar-entrega.use-case';
import {
  PostgresDepositoRepository,
  PostgresEntregaRepository,
  PostgresLoteRepository,
} from './infrastructure/postgres.repositories';
import { PadronComedorRepository } from './infrastructure/padron.comedor.repository';
import { RabbitMqPublicadorDeEntregas } from './infrastructure/rabbitmq.publicador';
import { EntregasController } from './presentation/entregas.controller';
import { DepositosController } from './presentation/depositos.controller';
import { PadronProvincialModule } from '../padron-provincial/padron-provincial.module';

@Module({
  imports: [PadronProvincialModule],
  controllers: [EntregasController, DepositosController],
  providers: [
    PostgresDepositoRepository,
    PostgresLoteRepository,
    PostgresEntregaRepository,
    PadronComedorRepository,
    RabbitMqPublicadorDeEntregas,
    { provide: DEPOSITO_REPOSITORY, useExisting: PostgresDepositoRepository },
    { provide: COMEDOR_REPOSITORY, useExisting: PadronComedorRepository },
    { provide: LOTE_REPOSITORY, useExisting: PostgresLoteRepository },
    { provide: ENTREGA_REPOSITORY, useExisting: PostgresEntregaRepository },
    { provide: PUBLICADOR_DE_ENTREGAS, useExisting: RabbitMqPublicadorDeEntregas },
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
  exports: [
    DEPOSITO_REPOSITORY,
    COMEDOR_REPOSITORY,
    LOTE_REPOSITORY,
    ENTREGA_REPOSITORY,
    PUBLICADOR_DE_ENTREGAS,
    RegistrarEntrega,
    ConfirmarEntrega,
    PostgresDepositoRepository,
    PostgresLoteRepository,
    PostgresEntregaRepository,
  ],
})
export class DistribucionModule {}
