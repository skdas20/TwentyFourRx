
import {
  Controller,
  Get,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  async getProfile(@CurrentUser() user: any) {
    return this.usersService.getUser(user.sub);
  }

  @Get('documents')
  async getDocuments(@CurrentUser() user: any) {
    return this.usersService.getUserDocuments(user.sub);
  }

  @Post('documents')
  @UseInterceptors(AnyFilesInterceptor())
  async uploadDocuments(
    @CurrentUser() user: any,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const documents: { [key: string]: Express.Multer.File } = {};
    files.forEach((file) => {
      documents[file.fieldname] = file;
    });

    return this.usersService.uploadKycDocuments(user.sub, documents);
  }
}
