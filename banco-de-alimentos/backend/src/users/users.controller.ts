import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { OidcJwtPayload } from '../auth/interfaces/oidc-payload.interface';
import { UsuarioPerfilResponseDto } from '../auth/dto/login.dto';

@Controller('api/v1/usuarios')
export class UsersController {
  @Get('me')
  @UseGuards(JwtAuthGuard)
  getPerfil(@CurrentUser() user: OidcJwtPayload): UsuarioPerfilResponseDto {
    return {
      id: user.sub,
      nombre: user.nombre,
      email: user.email,
      rol: user.rol,
      depositoAsignadoId: user.depositoAsignadoId,
      comedorAsignadoId: user.comedorAsignadoId
    };
  }
}
