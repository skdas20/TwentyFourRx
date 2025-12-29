import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PrismaService } from '../config/prisma.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { GcsService } from '../common/services/gcs.service';

@Controller('medicine-references')
export class MedicineReferencesController {
  constructor(
    private prisma: PrismaService,
    private gcsService: GcsService,
  ) {}

  @Get('search')
  @Public()
  async search(@Query('q') query: string) {
    if (!query || query.length < 2) {
      return [];
    }

    const results = await this.prisma.medicineReference.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { genericName: { contains: query, mode: 'insensitive' } },
          { composition: { contains: query, mode: 'insensitive' } },
        ],
        isActive: true,
      },
      take: 20,
      orderBy: { name: 'asc' },
    });

    return results.map((ref) => ({
      id: ref.id,
      label: `${ref.name} - ${ref.composition} (${ref.manufacturer})`,
      value: ref.id,
      name: ref.name,
      genericName: ref.genericName,
      composition: ref.composition,
      form: ref.form,
      strength: ref.strength,
      manufacturer: ref.manufacturer,
      marketer: ref.marketer,
      packSize: ref.packSize,
      mrp: ref.mrp ? parseFloat(ref.mrp.toString()) : null,
    }));
  }

  @Get('suggestions')
  @Public()
  async getSuggestions(
    @Query('field') field: string,
    @Query('q') query: string,
  ) {
    const validFields = ['name', 'composition', 'strength', 'manufacturer', 'form', 'genericName', 'packSize', 'marketer'];
    if (!validFields.includes(field)) {
      throw new BadRequestException(`Invalid field. Must be one of: ${validFields.join(', ')}`);
    }

    // Build where clause - if query is empty/short, show top 10 values
    const whereClause: any = {};

    if (query && query.length > 0) {
      whereClause[field] = { contains: query, mode: 'insensitive' };
    }

    // Get distinct values for the specified field
    const results = await this.prisma.medicineReference.findMany({
      where: whereClause,
      select: {
        [field]: true,
      },
      distinct: [field as any],
      take: 20,
      orderBy: {
        [field]: 'asc',
      },
    });

    // Extract unique values and filter out nulls
    const suggestions = Array.from(
      new Set(
        results.map((r) => r[field]).filter((v) => v != null && v !== '')
      )
    ).sort();

    return suggestions;
  }

  @Post('contribute')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER', 'TRADER')
  @UseInterceptors(FileInterceptor('productImage'))
  async contributeMedicine(
    @Request() req,
    @Body()
    body: {
      name: string;
      genericName?: string;
      composition: string;
      form: string;
      strength: string;
      manufacturer: string;
      marketer?: string;
      packSize?: string;
      mrp: string;
    },
    @UploadedFile() productImage?: Express.Multer.File,
  ) {
    // Validate required fields
    if (!body.name || !body.composition || !body.form || !body.strength || !body.manufacturer || !body.mrp) {
      throw new BadRequestException('Missing required fields: name, composition, form, strength, manufacturer, mrp');
    }

    // Validate product image is provided
    if (!productImage) {
      throw new BadRequestException('Product image is required for medicine contribution');
    }

    const mrpValue = parseFloat(body.mrp);
    if (isNaN(mrpValue) || mrpValue <= 0) {
      throw new BadRequestException('Invalid MRP value');
    }

    // Check if medicine already exists in reference table
    const existingRef = await this.prisma.medicineReference.findFirst({
      where: {
        name: { equals: body.name, mode: 'insensitive' },
        manufacturer: { equals: body.manufacturer, mode: 'insensitive' },
        strength: { equals: body.strength, mode: 'insensitive' },
      },
    });

    if (existingRef) {
      throw new BadRequestException('A medicine with this name, manufacturer, and strength already exists');
    }

    // Check if there's already a pending contribution for this medicine
    const existingContribution = await this.prisma.medicineContribution.findFirst({
      where: {
        name: { equals: body.name, mode: 'insensitive' },
        manufacturer: { equals: body.manufacturer, mode: 'insensitive' },
        strength: { equals: body.strength, mode: 'insensitive' },
        status: 'PENDING',
      },
    });

    if (existingContribution) {
      throw new BadRequestException('A contribution for this medicine is already pending approval');
    }

    // Upload product image to GCS
    let imageUrl: string | null = null;
    try {
      imageUrl = await this.gcsService.uploadFile(
        productImage,
        'medicine-contributions',
      );
    } catch (error) {
      console.error('Failed to upload product image:', error);
      throw new BadRequestException('Failed to upload product image');
    }

    // Create the medicine contribution (pending admin approval)
    const contribution = await this.prisma.medicineContribution.create({
      data: {
        contributorId: req.user.sub,
        name: body.name,
        genericName: body.genericName || null,
        composition: body.composition,
        form: body.form,
        strength: body.strength,
        manufacturer: body.manufacturer,
        marketer: body.marketer || null,
        packSize: body.packSize || null,
        mrp: mrpValue,
        imageUrl: imageUrl,
        status: 'PENDING',
      },
    });

    return {
      success: true,
      message: 'Medicine contribution submitted successfully. It will be available after admin approval.',
      contribution: {
        id: contribution.id,
        name: contribution.name,
        composition: contribution.composition,
        form: contribution.form,
        strength: contribution.strength,
        manufacturer: contribution.manufacturer,
        mrp: contribution.mrp ? parseFloat(contribution.mrp.toString()) : null,
        imageUrl: contribution.imageUrl,
        status: contribution.status,
      },
    };
  }

  // Admin endpoints for managing contributions
  @Get('contributions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async getContributions(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = parseInt(page || '1', 10);
    const limitNum = parseInt(limit || '20', 10);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (status && ['PENDING', 'APPROVED', 'REJECTED'].includes(status)) {
      where.status = status;
    }

    const [contributions, total] = await Promise.all([
      this.prisma.medicineContribution.findMany({
        where,
        include: {
          contributor: {
            select: { id: true, name: true, email: true },
          },
          reviewer: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      this.prisma.medicineContribution.count({ where }),
    ]);

    return {
      contributions: contributions.map((c) => ({
        id: c.id,
        name: c.name,
        genericName: c.genericName,
        composition: c.composition,
        form: c.form,
        strength: c.strength,
        manufacturer: c.manufacturer,
        marketer: c.marketer,
        packSize: c.packSize,
        mrp: c.mrp ? parseFloat(c.mrp.toString()) : null,
        imageUrl: c.imageUrl,
        status: c.status,
        reviewerNote: c.reviewerNote,
        createdAt: c.createdAt,
        reviewedAt: c.reviewedAt,
        contributor: c.contributor,
        reviewer: c.reviewer,
      })),
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };
  }

  @Post('contributions/:id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async approveContribution(
    @Request() req,
    @Param('id') id: string,
    @Body() body: { reviewerNote?: string },
  ) {
    const contributionId = id;
    
    const contribution = await this.prisma.medicineContribution.findUnique({
      where: { id: contributionId },
    });

    if (!contribution) {
      throw new BadRequestException('Contribution not found');
    }

    if (contribution.status !== 'PENDING') {
      throw new BadRequestException('This contribution has already been reviewed');
    }

    // Create the medicine reference from the contribution
    const medicineRef = await this.prisma.medicineReference.create({
      data: {
        name: contribution.name,
        genericName: contribution.genericName,
        composition: contribution.composition,
        form: contribution.form,
        strength: contribution.strength,
        manufacturer: contribution.manufacturer,
        marketer: contribution.marketer,
        packSize: contribution.packSize,
        mrp: contribution.mrp,
        imageUrl: contribution.imageUrl,
        source: 'user_contributed',
        lastScrapedAt: new Date(),
        isActive: true,
      },
    });

    // Update the contribution status
    await this.prisma.medicineContribution.update({
      where: { id: contributionId },
      data: {
        status: 'APPROVED',
        reviewedAt: new Date(),
        reviewedBy: req.user.sub,
        reviewerNote: body.reviewerNote || null,
      },
    });

    return {
      success: true,
      message: 'Contribution approved and medicine added to reference database',
      medicineReference: {
        id: medicineRef.id,
        name: medicineRef.name,
      },
    };
  }

  @Post('contributions/:id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async rejectContribution(
    @Request() req,
    @Param('id') id: string,
    @Body() body: { reviewerNote?: string },
  ) {
    const contributionId = id;
    
    const contribution = await this.prisma.medicineContribution.findUnique({
      where: { id: contributionId },
    });

    if (!contribution) {
      throw new BadRequestException('Contribution not found');
    }

    if (contribution.status !== 'PENDING') {
      throw new BadRequestException('This contribution has already been reviewed');
    }

    // Update the contribution status
    await this.prisma.medicineContribution.update({
      where: { id: contributionId },
      data: {
        status: 'REJECTED',
        reviewedAt: new Date(),
        reviewedBy: req.user.sub,
        reviewerNote: body.reviewerNote || 'Contribution rejected by admin',
      },
    });

    return {
      success: true,
      message: 'Contribution rejected',
    };
  }
}
