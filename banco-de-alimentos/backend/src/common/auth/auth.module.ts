import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from './auth.guard.js';
import { FakeTokenVerifier } from './fake-token.verifier.js';
import { VERIFICADOR_DE_TOKEN } from './verificador-de-token.js';

// AUTH_FAKE=true: tokens de prueba (solo para desarrollo)
//  Falta poner el adaptador de Firebase
const verificador =
  process.env.AUTH_FAKE === 'true'
    ? [{ provide: VERIFICADOR_DE_TOKEN, useClass: FakeTokenVerifier }]
    : [];

@Module({
  providers: [...verificador, { provide: APP_GUARD, useClass: AuthGuard }],
})
export class AuthModule {}
