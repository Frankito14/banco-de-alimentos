import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { OidcJwtPayload } from './interfaces/oidc-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('Configuración de seguridad crítica: Variable JWT_SECRET no definida en el entorno.');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret
    });
  }

  async validate(payload: OidcJwtPayload): Promise<OidcJwtPayload> {
    return {
      sub: payload.sub,
      email: payload.email,
      nombre: payload.nombre,
      rol: payload.rol,
      depositoAsignadoId: payload.depositoAsignadoId,
      comedorAsignadoId: payload.comedorAsignadoId,
      iss: payload.iss,
      aud: payload.aud
    };
  }
}
