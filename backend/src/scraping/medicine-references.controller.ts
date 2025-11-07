import { Controller, Get, Query } from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';

@Controller('medicine-references')
export class MedicineReferencesController {
  constructor(private prisma: PrismaService) {}

  @Get('search')
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
    }));
  }
}
