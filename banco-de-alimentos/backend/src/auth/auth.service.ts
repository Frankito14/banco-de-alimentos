import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { LoginRequestDto, LoginResponseDto } from './dto/login.dto';
import { OidcJwtPayload } from './interfaces/oidc-payload.interface';
import { ProblemDetailsException } from '../common/exceptions/problem-details.exception';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService
  ) {}

  async login(loginDto: LoginRequestDto): Promise<LoginResponseDto> {
    const user = await this.usersService.findByEmail(loginDto.usuario);

    const isPasswordValid = user
      ? await this.usersService.comparePassword(loginDto.password, user.passwordHash)
      : false;

    if (!user || !isPasswordValid) {
      throw new ProblemDetailsException({
        status: 401,
        title: 'Credenciales Inválidas (OIDC)',
        detail: 'El correo electrónico o la contraseña ingresada son incorrectos.',
        type: 'https://bancodealimentos.gob.ar/errores/credenciales-invalidas'
      });
    }

    const payload = {
      sub: user.id,
      email: user.email,
      nombre: user.nombre,
      rol: user.rol,
      depositoAsignadoId: user.depositoAsignadoId,
      comedorAsignadoId: user.comedorAsignadoId
    };

    const token = this.jwtService.sign(payload);

    return {
      token,
      tokenType: 'Bearer',
      expiresIn: 3600,
      usuario: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        depositoAsignadoId: user.depositoAsignadoId,
        comedorAsignadoId: user.comedorAsignadoId
      }
    };
  }

  /**
   * Endpoint de configuración estándar OIDC (OpenID Connect Discovery 1.0)
   */
  getOpenIdConfiguration() {
    const baseUrl = 'http://localhost:3000';
    return {
      issuer: 'https://oidc.bancodealimentos.gob.ar',
      authorization_endpoint: `${baseUrl}/api/v1/auth/login`,
      token_endpoint: `${baseUrl}/api/v1/auth/login`,
      userinfo_endpoint: `${baseUrl}/api/v1/usuarios/me`,
      response_types_supported: ['token', 'id_token'],
      subject_types_supported: ['public'],
      id_token_signing_alg_values_supported: ['HS256'],
      scopes_supported: ['openid', 'profile', 'email', 'roles'],
      claims_supported: ['sub', 'iss', 'aud', 'email', 'name', 'roles', 'depositoAsignadoId', 'comedorAsignadoId']
    };
  }
}
