import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { DemoGuardController } from './common/demo/demo-guard.controller';
import { MessagingModule } from './common/messaging/messaging.module';

@Module({
  imports: [AuthModule, UsersModule, MessagingModule],
  controllers: [DemoGuardController],
  providers: []
})
export class AppModule { }
