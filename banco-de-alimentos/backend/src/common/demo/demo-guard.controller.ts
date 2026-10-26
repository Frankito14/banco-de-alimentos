import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { OidcJwtPayload } from '../../auth/interfaces/oidc-payload.interface';

@Controller('api/v1/demo')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DemoGuardController {
  @Get('solo-voluntarios')
  @Roles('Voluntario')
  soloVoluntarios(@CurrentUser() user: OidcJwtPayload) {
    return {
      mensaje: `Acceso concedido para el Voluntario ${user.nombre}`,
      rol: user.rol,
      depositoId: user.depositoAsignadoId
    };
  }

  @Get('solo-coordinadores')
  @Roles('Coordinador')
  soloCoordinadores(@CurrentUser() user: OidcJwtPayload) {
    return {
      mensaje: `Acceso concedido a Coordinación Provincial para ${user.nombre}`,
      rol: user.rol
    };
  }
}
