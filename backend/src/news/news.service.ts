import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';
import { GcsService } from '../common/services/gcs.service';

@Injectable()
export class NewsService {
  constructor(
    private prisma: PrismaService,
    private gcsService: GcsService,
  ) {}

  async getPublishedNews(skip = 0, take = 20) {
    const [news, total] = await Promise.all([
      this.prisma.newsArticle.findMany({
        where: { isPublished: true },
        include: {
          author: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { publishedAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.newsArticle.count({ where: { isPublished: true } }),
    ]);

    return { data: news, total, skip, take };
  }

  async getNewsById(id: string) {
    const news = await this.prisma.newsArticle.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!news) {
      throw new NotFoundException('News article not found');
    }

    return news;
  }

  async getAllNews() {
    return this.prisma.newsArticle.findMany({
      include: {
        author: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createNews(
    authorAdminId: string,
    dto: any,
    thumbnail?: Express.Multer.File,
  ) {
    let thumbnailUrl: string | undefined;

    // Upload thumbnail if provided
    if (thumbnail) {
      try {
        thumbnailUrl = await this.gcsService.uploadFile(thumbnail, 'news-thumbnails');
        console.log('✅ Thumbnail uploaded:', thumbnailUrl);
      } catch (error) {
        console.error('❌ Failed to upload thumbnail:', error);
      }
    }

    // Generate slug from title
    const slug = dto.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    // Convert isPublished to boolean (FormData sends strings)
    const isPublished = dto.isPublished === true || dto.isPublished === 'true';

    const news = await this.prisma.newsArticle.create({
      data: {
        title: dto.title,
        slug: `${slug}-${Date.now()}`,
        content: dto.content || '',
        summary: dto.summary,
        thumbnailUrl: thumbnailUrl || dto.thumbnailUrl,
        externalUrl: dto.externalUrl || null,
        isPublished,
        publishedAt: isPublished ? new Date() : null,
        authorAdminId,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return { message: 'News article created successfully', news };
  }

  async updateNews(id: string, dto: any, thumbnail?: Express.Multer.File) {
    const existing = await this.prisma.newsArticle.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('News article not found');
    }

    let thumbnailUrl = existing.thumbnailUrl;

    // Upload new thumbnail if provided
    if (thumbnail) {
      try {
        thumbnailUrl = await this.gcsService.uploadFile(thumbnail, 'news-thumbnails');
        console.log('✅ Thumbnail uploaded:', thumbnailUrl);
      } catch (error) {
        console.error('❌ Failed to upload thumbnail:', error);
      }
    } else if (dto.thumbnailUrl) {
      thumbnailUrl = dto.thumbnailUrl;
    }

    // Convert isPublished to boolean (FormData sends strings)
    const isPublished = dto.isPublished === true || dto.isPublished === 'true';

    const news = await this.prisma.newsArticle.update({
      where: { id },
      data: {
        title: dto.title,
        content: dto.content,
        summary: dto.summary,
        thumbnailUrl,
        externalUrl: dto.externalUrl || null,
        isPublished,
        publishedAt: isPublished && !existing.publishedAt ? new Date() : existing.publishedAt,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return { message: 'News article updated successfully', news };
  }

  async deleteNews(id: string) {
    await this.prisma.newsArticle.delete({
      where: { id },
    });

    return { message: 'News article deleted successfully' };
  }

  async togglePublish(id: string, isPublished: boolean) {
    const news = await this.prisma.newsArticle.update({
      where: { id },
      data: {
        isPublished,
        publishedAt: isPublished ? new Date() : null,
      },
    });

    return { message: `News article ${isPublished ? 'published' : 'unpublished'} successfully`, news };
  }
}
