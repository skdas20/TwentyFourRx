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

    // For each medicine reference, find the lowest price from active listings
    const medicinesWithPrices = await Promise.all(
      medicines.map(async (med) => {
        // Find matching medicine in the medicines table
        const medicine = await this.prisma.medicine.findFirst({
          where: {
            name: med.name,
            form: med.form,
            strength: med.strength,
          },
        });

        if (medicine) {
          // Find the lowest price active listing for this medicine
          const lowestListing = await this.prisma.listing.findFirst({
            where: {
              medicineId: medicine.id,
              status: 'ACTIVE',
              stock: { gt: 0 },
            },
            orderBy: { listPrice: 'asc' },
            select: { listPrice: true },
          });

          return {
            ...med,
            lowestPrice: lowestListing ? Number(lowestListing.listPrice) : null,
          };
        }

        return { ...med, lowestPrice: null };
      })
    );

    return {
      data: medicinesWithPrices,
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
