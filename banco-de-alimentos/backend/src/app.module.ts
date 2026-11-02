import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { DemoGuardController } from './common/demo/demo-guard.controller';
import { Module } from '@nestjs/common';
import { InventarioModule } from './inventario/inventario.module.js';
import { DistribucionModule } from './distribucion/distribucion.module.js';
import { ComedoresModule } from './comedores/comedores.module.js';
import { AuditoriaModule } from './auditoria/auditoria.module.js';
import { AuthModule } from './common/auth/auth.module.js';

@Module({
  imports: [AuthModule, UsersModule, InventarioModule, DistribucionModule, ComedoresModule, AuditoriaModule],
  controllers: [DemoGuardController],
  providers: []
})
export class AppModule {}

