import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { PostgresDepositoRepository, PostgresLoteRepository } from '../infrastructure/postgres.repositories';

@Controller('depositos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DepositosController {
  constructor(
    private readonly depositoRepo: PostgresDepositoRepository,
    private readonly loteRepo: PostgresLoteRepository,
  ) {}

  @Get()
  @Roles('Voluntario', 'ReferenteComedor', 'Coordinador')
  async listarDepositos() {
    return this.depositoRepo.findAll();
  }

  @Get(':depositoId/stock')
  @Roles('Voluntario', 'ReferenteComedor', 'Coordinador')
  async obtenerStockPorDeposito(@Param('depositoId') depositoId: string) {
    return this.loteRepo.findByDepositoId(depositoId);
  }
}
