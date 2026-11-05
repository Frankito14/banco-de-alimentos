import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

import { DatabaseModule } from './common/database/database.module';
import { AuthModule } from './auth/auth.module';
import { DemoGuardController } from './common/demo/demo-guard.controller';
import { MessagingModule } from './common/messaging/messaging.module';
import { RedisModule } from './common/redis/redis.module';
import { PadronProvincialModule } from './padron-provincial/padron-provincial.module';
import { RendicionCuentasModule } from './rendicion-cuentas/rendicion-cuentas.module';

import { InventarioModule } from './inventario/inventario.module';
import { DistribucionModule } from './distribucion/distribucion.module';
import { ComedoresModule } from './comedores/comedores.module';
import { AuditoriaModule } from './auditoria/auditoria.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env'],
    }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    AuthModule,
    MessagingModule,
    RedisModule,
    PadronProvincialModule,
    RendicionCuentasModule,
    InventarioModule,
    DistribucionModule,
    ComedoresModule,
    AuditoriaModule,
  ],
  controllers: [DemoGuardController],
  providers: [],
})
export class AppModule {}
