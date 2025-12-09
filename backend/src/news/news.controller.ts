import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { NewsService } from './news.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';

@Controller('news')
export class NewsController {
  constructor(private newsService: NewsService) {}

  // PUBLIC: Get all published news
  @Get()
  @Public()
  async getPublishedNews(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.newsService.getPublishedNews(
      parseInt(skip || '0'),
      parseInt(take || '20'),
    );
  }

  // PUBLIC: Get single news article
  @Get(':id')
  @Public()
  async getNewsById(@Param('id') id: string) {
    return this.newsService.getNewsById(id);
  }

  // ADMIN: Get all news (including unpublished)
  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async getAllNews() {
    return this.newsService.getAllNews();
  }

  // ADMIN: Create news
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @UseInterceptors(FileInterceptor('thumbnail'))
  async createNews(
    @CurrentUser() user: any,
    @Body() dto: any,
    @UploadedFile() thumbnail?: Express.Multer.File,
  ) {
    return this.newsService.createNews(user.sub, dto, thumbnail);
  }

  // ADMIN: Update news
  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @UseInterceptors(FileInterceptor('thumbnail'))
  async updateNews(
    @Param('id') id: string,
    @Body() dto: any,
    @UploadedFile() thumbnail?: Express.Multer.File,
  ) {
    return this.newsService.updateNews(id, dto, thumbnail);
  }

  // ADMIN: Delete news
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async deleteNews(@Param('id') id: string) {
    return this.newsService.deleteNews(id);
  }

  // ADMIN: Publish/Unpublish news
  @Put(':id/publish')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async togglePublish(@Param('id') id: string, @Body() dto: { isPublished: boolean }) {
    return this.newsService.togglePublish(id, dto.isPublished);
  }
}
