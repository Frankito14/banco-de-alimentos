import { Module } from '@nestjs/common';
import { InventarioModule } from './inventario/inventario.module.js';
import { DistribucionModule } from './distribucion/distribucion.module.js';
import { ComedoresModule } from './comedores/comedores.module.js';
import { AuditoriaModule } from './auditoria/auditoria.module.js';
import { AuthModule } from './common/auth/auth.module.js';


@Module({
  imports: [AuthModule, InventarioModule, DistribucionModule, ComedoresModule, AuditoriaModule],
})
export class AppModule {}
