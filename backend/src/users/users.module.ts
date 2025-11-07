import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { PrismaService } from '../config/prisma.service';
import { EmailService } from '../common/services/email.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService, PrismaService, EmailService],
  exports: [UsersService],
})
export class UsersModule {}
