import { Injectable } from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';

@Injectable()
export class MedicinesService {
  constructor(private prisma: PrismaService) {}

  async getMedicines(search?: string, skip = 0, take = 20) {
    const where: any = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as any } },
            { composition: { contains: search, mode: 'insensitive' as any } },
            { manufacturer: { contains: search, mode: 'insensitive' as any } },
          ],
        }
      : {};

    const [medicines, total] = await Promise.all([
      this.prisma.medicineReference.findMany({
        where,
        skip,
        take,
        orderBy: { name: 'asc' },
      }),
      this.prisma.medicineReference.count({ where }),
    ]);

    return {
      data: medicines,
      total,
      skip,
      take,
    };
  }

  async getMedicineById(id: string) {
    return this.prisma.medicineReference.findUnique({
      where: { id },
    });
  }
}
