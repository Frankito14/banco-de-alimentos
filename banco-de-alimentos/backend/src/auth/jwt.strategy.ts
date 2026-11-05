import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';
import { Rol } from './interfaces/oidc-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor() {
    const keycloakInternalUrl = process.env.KEYCLOAK_INTERNAL_URL || 'http://keycloak:8080';
    const realm = process.env.KEYCLOAK_REALM || 'banco-de-alimentos';
    const jwksUri = `${keycloakInternalUrl}/realms/${realm}/protocol/openid-connect/certs`;

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      algorithms: ['RS256'],
      secretOrKeyProvider: (request, rawJwtToken, done) => {
        // Validación delegada estricta mediante JWKS de Keycloak (sin fallback)
        passportJwtSecret({
          cache: true,
          rateLimit: true,
          jwksRequestsPerMinute: 10,
          jwksUri,
        })(request, rawJwtToken, (err, key) => {
          if (err || !key) {
            return done(err || new Error('No se pudo verificar la firma del token contra Keycloak OIDC'));
          }
          return done(null, key);
        });
      },
    });
  }

  async validate(payload: any) {
    let rol: Rol = (payload.rol as Rol) || 'Voluntario';
    if (!payload.rol) {
      const realmRoles: string[] = payload.realm_access?.roles || payload.roles || [];
      if (realmRoles.includes('Coordinador')) {
        rol = 'Coordinador';
      } else if (realmRoles.includes('ReferenteComedor')) {
        rol = 'ReferenteComedor';
      } else if (realmRoles.includes('Voluntario')) {
        rol = 'Voluntario';
      }
    }

    const nombre = payload.nombre || payload.name || payload.preferred_username || 'Usuario OIDC';

    return {
      id: payload.sub,
      sub: payload.sub,
      email: payload.email,
      nombre,
      rol,
      depositoAsignadoId: payload.depositoAsignadoId || null,
      comedorAsignadoId: payload.comedorAsignadoId || null,
      iss: payload.iss,
      aud: payload.aud,
    };
  }
}
