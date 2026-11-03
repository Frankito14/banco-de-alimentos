import { Module } from '@nestjs/common';
import { ComedoresController } from './comedores.controller';
import { ComedoresService } from './comedores.service';
import { PadronProvincialModule } from '../padron-provincial/padron-provincial.module';

@Module({
  imports: [PadronProvincialModule],
  controllers: [ComedoresController],
  providers: [ComedoresService],
  exports: [ComedoresService],
})
export class ComedoresModule {}
