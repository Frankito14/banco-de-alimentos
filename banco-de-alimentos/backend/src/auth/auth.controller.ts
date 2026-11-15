import { Controller, Post, Body, Get, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { AuthService, UsuarioDemoDto } from './auth.service';
import { LoginRequestDto, LoginResponseDto, UsuarioPerfilResponseDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { OidcJwtPayload } from './interfaces/oidc-payload.interface';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Endpoint de autenticación OIDC según contrato OpenAPI (/api/v1/auth/login)
   */
  @Post('auth/login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginRequestDto): Promise<LoginResponseDto> {
    return this.authService.login(loginDto);
  }

  /**
   * Lista los usuarios disponibles en Keycloak enriquecidos con sus asignaciones reales en PostgreSQL
   */
  @Get('auth/usuarios-demo')
  async obtenerUsuariosDemo(): Promise<UsuarioDemoDto[]> {
    return this.authService.obtenerUsuariosDemo();
  }

  /**
   * Autenticación de acceso rápido para demo delegada en el backend (evita credenciales en el frontend)
   */
  @Post('auth/login-demo')
  @HttpCode(HttpStatus.OK)
  async loginDemo(@Body('email') email: string): Promise<LoginResponseDto> {
    return this.authService.loginDemo(email);
  }

  /**
   * Perfil del usuario autenticado a partir de los claims del token OIDC emitido por Keycloak
   */
  @Get('usuarios/me')
  @UseGuards(JwtAuthGuard)
  getPerfil(@CurrentUser() user: OidcJwtPayload): UsuarioPerfilResponseDto {
    return {
      id: user.sub,
      nombre: user.nombre,
      email: user.email,
      rol: user.rol,
      depositoAsignadoId: user.depositoAsignadoId,
      comedorAsignadoId: user.comedorAsignadoId,
    };
  }

  /**
   * Metadata estándar OpenID Connect Discovery 1.0 (/.well-known/openid-configuration)
   */
  @Get('.well-known/openid-configuration')
  getOpenIdConfiguration() {
    return this.authService.getOpenIdConfiguration();
  }
}
