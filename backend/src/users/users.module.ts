import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { ProfileController } from './profile.controller';
import { UsersService } from './users.service';
import { PrismaService } from '../config/prisma.service';
import { EmailService } from '../common/services/email.service';
import { GcsService } from '../common/services/gcs.service';
import { WatermarkService } from '../common/services/watermark.service';

@Module({
  controllers: [UsersController, ProfileController],
  providers: [UsersService, PrismaService, EmailService, GcsService, WatermarkService],
  exports: [UsersService],
})
export class UsersModule {}
