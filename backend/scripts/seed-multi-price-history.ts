import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DAYS = 30;
const BATCH_SIZE = 24; // Dolo + ~23 more medicines

async function main() {
  console.log('📈 Seeding price history for multiple medicines...');

  const medicines = await prisma.medicine.findMany({
    where: {
      listings: { some: { status: 'ACTIVE' } },
    },
    include: {
      listings: {
        where: { status: 'ACTIVE' },
        orderBy: { listPrice: 'asc' },
        take: 1,
      },
    },
    take: BATCH_SIZE,
  });

  if (medicines.length === 0) {
    console.log('⚠️ No medicines with active listings found.');
    return;
  }

  for (const med of medicines) {
    const anchorListing = med.listings[0];
    const anchorPrice = anchorListing
      ? Number(anchorListing.listPrice || anchorListing.basePrice || 0)
      : 50;

    const startingPrice = anchorPrice || 50;
    const direction = Math.random() > 0.5 ? 1 : -1; // Up or down bias
    let price = startingPrice * (0.94 + Math.random() * 0.12); // Start near anchor price

    const historyData: Prisma.PriceHistoryCreateManyInput[] = [];

    for (let i = DAYS - 1; i >= 0; i--) {
      const day = new Date();
      day.setDate(day.getDate() - i);
      day.setHours(0, 0, 0, 0);

      // Bias drift plus small daily wiggle
      const drift = direction * (0.003 + Math.random() * 0.01); // 0.3% - 1% per day
      const wiggle = (Math.random() - 0.5) * 0.01; // +/-0.5%
      price = price * (1 + drift + wiggle);

      // Keep price within reasonable bounds around anchor
      const lowerBound = startingPrice * 0.65;
      const upperBound = startingPrice * 1.45;
      price = Math.max(lowerBound, Math.min(upperBound, price));

      const avgPrice = Number(price.toFixed(2));
      const minPrice = Number((avgPrice * 0.985).toFixed(2));
      const maxPrice = Number((avgPrice * 1.015).toFixed(2));

      historyData.push({
        medicineId: med.id,
        day,
        minPrice,
        maxPrice,
        avgPrice,
      });
    }

    // Ensure at least ~2% change between first and last day for trending detection
    const firstAvg = Number(historyData[0].avgPrice);
    const lastIndex = historyData.length - 1;
    let lastAvg = Number(historyData[lastIndex].avgPrice);
    const changePct = Math.abs((lastAvg - firstAvg) / firstAvg) * 100;

    if (changePct < 2) {
      const adjustDirection = direction >= 0 ? 1 : -1;
      lastAvg = Number((firstAvg * (1 + adjustDirection * 0.03)).toFixed(2));
      historyData[lastIndex] = {
        ...historyData[lastIndex],
        avgPrice: lastAvg,
        minPrice: Number((lastAvg * 0.985).toFixed(2)),
        maxPrice: Number((lastAvg * 1.015).toFixed(2)),
      };
    }

    // Replace existing history for this medicine
    await prisma.priceHistory.deleteMany({ where: { medicineId: med.id } });
    await prisma.priceHistory.createMany({ data: historyData });

    console.log(`✅ ${med.name} (${med.id}) - seeded ${historyData.length} days`);
  }

  console.log('🎯 Done seeding price history.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

