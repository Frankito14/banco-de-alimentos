import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { DemoGuardController } from './common/demo/demo-guard.controller';

@Module({
  imports: [AuthModule, UsersModule],
  controllers: [DemoGuardController],
  providers: []
})
export class AppModule {}
