import { Module } from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import { FakeTokenVerifier } from './fake-token.verifier';
import { VERIFICADOR_DE_TOKEN } from './verificador-de-token';

@Module({
  providers: [
    { provide: VERIFICADOR_DE_TOKEN, useClass: FakeTokenVerifier },
    AuthGuard,
  ],
  exports: [AuthGuard, VERIFICADOR_DE_TOKEN],
})
export class AuthModule {}
