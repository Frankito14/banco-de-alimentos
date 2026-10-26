import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { UsersModule } from '../users/users.module';
import { RolesGuard } from './guards/roles.guard';

@Module({
  imports: [
    UsersModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      useFactory: () => {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
          throw new Error('Configuración de seguridad crítica: Variable JWT_SECRET no definida en el entorno.');
        }
        return {
          secret,
          signOptions: {
            expiresIn: process.env.JWT_EXPIRES_IN || '3600s',
            issuer: process.env.OIDC_ISSUER || 'https://oidc.bancodealimentos.gob.ar',
            audience: process.env.OIDC_AUDIENCE || 'banco-de-alimentos-api'
          }
        };
      }
    })
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, RolesGuard],
  exports: [AuthService, JwtModule, PassportModule, RolesGuard]
})
export class AuthModule {}
