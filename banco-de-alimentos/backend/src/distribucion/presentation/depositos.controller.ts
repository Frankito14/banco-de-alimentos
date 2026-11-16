import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { OidcJwtPayload } from '../../auth/interfaces/oidc-payload.interface';
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
  async listarDepositos(@CurrentUser() user: OidcJwtPayload) {
    const depositos = await this.depositoRepo.findAll();
    if (user?.rol === 'Voluntario' && user.depositoAsignadoId) {
      return depositos.filter((d) => d.id === user.depositoAsignadoId);
    }
    return depositos;
  }

  @Get(':depositoId/stock')
  @Roles('Voluntario', 'ReferenteComedor', 'Coordinador')
  async obtenerStockPorDeposito(@Param('depositoId') depositoId: string) {
    return this.loteRepo.findByDepositoId(depositoId);
  }
}
