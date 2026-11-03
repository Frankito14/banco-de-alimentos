import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ComedoresService } from './comedores.service';

@Controller('comedores')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ComedoresController {
  constructor(private readonly comedoresService: ComedoresService) {}

  @Get()
  @Roles('Voluntario', 'ReferenteComedor', 'Coordinador')
  async listarComedores() {
    return this.comedoresService.obtenerComedores();
  }
}
