import { Injectable } from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';

@Injectable()
export class MedicinesService {
  constructor(private prisma: PrismaService) {}

  async getMedicines(search?: string, skip = 0, take = 20) {
    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { composition: { contains: search, mode: 'insensitive' } },
            { manufacturer: { contains: search, mode: 'insensitive' } },
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
