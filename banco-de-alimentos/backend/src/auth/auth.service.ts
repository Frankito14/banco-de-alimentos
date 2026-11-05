import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LoginRequestDto, LoginResponseDto } from './dto/login.dto';
import { ProblemDetailsException } from '../common/exceptions/problem-details.exception';
import { Rol } from './interfaces/oidc-payload.interface';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly jwtService: JwtService) {}

  /**
   * Autenticación delegada en el Identity Provider OIDC (Keycloak).
   * La aplicación no gestiona contraseñas ni hashes propios.
   */
  async login(loginDto: LoginRequestDto): Promise<LoginResponseDto> {
    const keycloakInternalUrl = process.env.KEYCLOAK_INTERNAL_URL || 'http://keycloak:8080';
    const realm = process.env.KEYCLOAK_REALM || 'banco-de-alimentos';
    const clientId = process.env.KEYCLOAK_CLIENT_ID || 'banco-alimentos-client';
    const tokenUrl = `${keycloakInternalUrl}/realms/${realm}/protocol/openid-connect/token`;

    try {
      const params = new URLSearchParams();
      params.append('grant_type', 'password');
      params.append('client_id', clientId);
      params.append('username', loginDto.usuario);
      params.append('password', loginDto.password);

      this.logger.log(`Delegando autenticación a Keycloak IdP: ${loginDto.usuario}`);

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.warn(`Keycloak rechazó credenciales para ${loginDto.usuario}: ${errorText}`);
        throw new ProblemDetailsException({
          status: 401,
          title: 'Credenciales Inválidas (Keycloak OIDC)',
          detail: 'El correo electrónico o la contraseña son incorrectos en el Proveedor de Identidad Keycloak.',
          type: 'https://bancodealimentos.gob.ar/errores/credenciales-invalidas',
        });
      }

      const tokenData = await response.json();
      const accessToken = tokenData.access_token;

      // Decodificar claims del token emitido por Keycloak
      const decoded: any = this.jwtService.decode(accessToken) || {};

      let rol: Rol = (decoded.rol as Rol) || 'Voluntario';
      if (!decoded.rol) {
        const realmRoles: string[] = decoded.realm_access?.roles || decoded.roles || [];
        if (realmRoles.includes('Coordinador')) {
          rol = 'Coordinador';
        } else if (realmRoles.includes('ReferenteComedor')) {
          rol = 'ReferenteComedor';
        } else if (realmRoles.includes('Voluntario')) {
          rol = 'Voluntario';
        }
      }

      const nombre = decoded.nombre || decoded.name || decoded.preferred_username || loginDto.usuario;

      return {
        token: accessToken,
        tokenType: 'Bearer',
        expiresIn: tokenData.expires_in || 3600,
        usuario: {
          id: decoded.sub,
          nombre,
          email: decoded.email || loginDto.usuario,
          rol,
          depositoAsignadoId: decoded.depositoAsignadoId || null,
          comedorAsignadoId: decoded.comedorAsignadoId || null,
        },
      };
    } catch (err) {
      if (err instanceof ProblemDetailsException) throw err;
      this.logger.error(`Error de conexión con Keycloak: ${(err as Error).message}`);
      throw new ProblemDetailsException({
        status: 503,
        title: 'Proveedor OIDC No Disponible',
        detail: `No se pudo conectar con el contenedor de Keycloak: ${(err as Error).message}`,
        type: 'https://bancodealimentos.gob.ar/errores/idp-no-disponible',
      });
    }
  }

  /**
   * Endpoint de configuración OIDC Discovery 1.0 apuntando al IdP Keycloak
   */
  getOpenIdConfiguration() {
    const keycloakPublicUrl = process.env.KEYCLOAK_URL || 'http://localhost:8080';
    const realm = process.env.KEYCLOAK_REALM || 'banco-de-alimentos';
    const baseUrl = `${keycloakPublicUrl}/realms/${realm}`;

    return {
      issuer: baseUrl,
      authorization_endpoint: `${baseUrl}/protocol/openid-connect/auth`,
      token_endpoint: `${baseUrl}/protocol/openid-connect/token`,
      userinfo_endpoint: `${baseUrl}/protocol/openid-connect/userinfo`,
      jwks_uri: `${baseUrl}/protocol/openid-connect/certs`,
      response_types_supported: ['code', 'none', 'id_token', 'token', 'id_token token'],
      subject_types_supported: ['public'],
      id_token_signing_alg_values_supported: ['RS256'],
      scopes_supported: ['openid', 'profile', 'email', 'roles'],
      claims_supported: ['sub', 'iss', 'aud', 'email', 'name', 'roles', 'depositoAsignadoId', 'comedorAsignadoId'],
    };
  }
}
