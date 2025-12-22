import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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

  // ADMIN: Get all medicines from Medicine table for management
  async getAllMedicinesForAdmin() {
    const medicines = await this.prisma.medicine.findMany({
      include: {
        manufacturer: {
          select: {
            id: true,
            name: true,
          },
        },
        marketer: {
          select: {
            id: true,
            name: true,
          },
        },
        listings: {
          select: {
            id: true,
            status: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    console.log(`📋 Fetched ${medicines.length} medicines for admin management`);
    return medicines;
  }

  // ADMIN: Update medicine
  async updateMedicine(
    id: string,
    data: {
      name?: string;
      form?: string;
      strength?: string;
      imageUrl?: string;
      isActive?: boolean;
    },
  ) {
    // Check if medicine exists
    const medicine = await this.prisma.medicine.findUnique({
      where: { id },
    });

    if (!medicine) {
      throw new NotFoundException('Medicine not found');
    }

    // Update medicine
    const updated = await this.prisma.medicine.update({
      where: { id },
      data,
      include: {
        manufacturer: true,
        marketer: true,
      },
    });

    console.log(`✅ Medicine updated: ${updated.name}`);
    return {
      message: 'Medicine updated successfully',
      medicine: updated,
    };
  }

  // ADMIN: Delete medicine
  async deleteMedicine(id: string) {
    // Check if medicine exists
    const medicine = await this.prisma.medicine.findUnique({
      where: { id },
      include: {
        listings: {
          select: { id: true },
        },
      },
    });

    if (!medicine) {
      throw new NotFoundException('Medicine not found');
    }

    // Check if there are active listings
    const activeListings = await this.prisma.listing.count({
      where: {
        medicineId: id,
        status: { in: ['ACTIVE', 'PENDING'] },
      },
    });

    if (activeListings > 0) {
      throw new BadRequestException(
        `Cannot delete medicine with ${activeListings} active or pending listing(s). Please deactivate or delete listings first.`,
      );
    }

    // Delete medicine (this will also delete associated listings due to cascade)
    await this.prisma.medicine.delete({
      where: { id },
    });

    console.log(`🗑️ Medicine deleted: ${medicine.name}`);
    return {
      message: 'Medicine deleted successfully',
    };
  }
}
