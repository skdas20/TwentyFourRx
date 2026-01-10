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
            seller: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
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
    });

    if (!medicine) {
      throw new NotFoundException('Medicine not found');
    }

    try {
      // Get all listings for this medicine first
      const listings = await this.prisma.listing.findMany({
        where: { medicineId: id },
        select: { id: true },
      });

      const listingIds = listings.map(l => l.id);

      if (listingIds.length > 0) {
        // 1. Delete all orders related to these listings
        await this.prisma.order.deleteMany({
          where: { listingId: { in: listingIds } },
        });

        // 2. Delete all buy proposals related to these listings
        await this.prisma.buyProposal.deleteMany({
          where: { listingId: { in: listingIds } },
        });

        // 3. Delete all holds related to these listings
        await this.prisma.hold.deleteMany({
          where: { listingId: { in: listingIds } },
        });

        // 4. Now safe to delete listings
        await this.prisma.listing.deleteMany({
          where: { medicineId: id },
        });
      }

      // 5. Get all inventory lots for this medicine
      const inventoryLots = await this.prisma.inventoryLot.findMany({
        where: { medicineId: id },
        select: { id: true },
      });

      const inventoryLotIds = inventoryLots.map(lot => lot.id);

      if (inventoryLotIds.length > 0) {
        // 5a. Delete delivery requests that reference these inventory lots
        await this.prisma.deliveryRequest.deleteMany({
          where: { inventoryLotId: { in: inventoryLotIds } },
        });

        // 5b. Now safe to delete inventory lots
        await this.prisma.inventoryLot.deleteMany({
          where: { medicineId: id },
        });
      }

      // 6. Delete medicine proposals (if any reference this medicine)
      await this.prisma.medicineProposal.deleteMany({
        where: { approvedMedicineId: id },
      });

      // 7. Other relations with cascade will be handled automatically:
      // - priceHistory (has cascade)
      // - newsMedicines (has cascade)
      // - analyticsRollups (has cascade)
      // - watchlists (has cascade)
      // - priceAlerts (has cascade)

      // 8. Finally delete the medicine
      await this.prisma.medicine.delete({
        where: { id },
      });

      console.log(`🗑️ Medicine deleted successfully: ${medicine.name}`);
      return {
        message: 'Medicine deleted successfully',
      };
    } catch (error) {
      console.error('Error deleting medicine:', error);
      throw new BadRequestException(
        `Unable to delete medicine: ${error.message}. It may have active references in protected records.`
      );
    }
  }
}
