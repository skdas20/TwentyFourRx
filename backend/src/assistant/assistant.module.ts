import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaService } from '../config/prisma.service';
import { AssistantDataService } from './assistant-data.service';
import { AssistantService } from './assistant.service';

@Module({
  imports: [AuthModule],
  providers: [AssistantService, AssistantDataService, PrismaService],
})
export class AssistantModule {}
