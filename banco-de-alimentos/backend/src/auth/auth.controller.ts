import { Controller, Post, Body, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginRequestDto, LoginResponseDto } from './dto/login.dto';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Endpoint de autenticación OIDC según contrato OpenAPI
   */
  @Post('api/v1/auth/login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginRequestDto): Promise<LoginResponseDto> {
    return this.authService.login(loginDto);
  }

  /**
   * Metadata estándar OpenID Connect Discovery 1.0
   */
  @Get('.well-known/openid-configuration')
  getOpenIdConfiguration() {
    return this.authService.getOpenIdConfiguration();
  }
}
