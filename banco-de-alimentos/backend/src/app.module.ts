import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { InventarioModule } from './inventario/inventario.module.js';
import { DistribucionModule } from './distribucion/distribucion.module.js';
import { ComedoresModule } from './comedores/comedores.module.js';
import { AuditoriaModule } from './auditoria/auditoria.module.js';


@Module({
  imports: [InventarioModule, DistribucionModule, ComedoresModule, AuditoriaModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
