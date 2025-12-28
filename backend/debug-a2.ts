import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function investigate() {
  // Find A2 Tablet medicine
  const medicine = await prisma.medicine.findFirst({
    where: { name: { contains: 'A2', mode: 'insensitive' } },
    include: {
      manufacturer: true,
      listings: {
        where: { status: 'ACTIVE', stock: { gt: 0 } },
        orderBy: { listPrice: 'asc' }
      }
    }
  });

  console.log('\n=== MEDICINE INFO ===');
  console.log('ID:', medicine?.id);
  console.log('Name:', medicine?.name);
  console.log('Manufacturer:', medicine?.manufacturer?.name);

  console.log('\n=== ACTIVE LISTINGS ===');
  medicine?.listings.forEach((l, i) => {
    console.log(`Listing ${i+1}:`);
    console.log('  ID:', l.id);
    console.log('  basePrice:', l.basePrice.toString());
    console.log('  listPrice:', l.listPrice?.toString() || 'NULL');
    console.log('  stock:', l.stock);
    console.log('  Final Price:', l.listPrice?.toString() || l.basePrice.toString());
  });

  // Get price history for last 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const history = await prisma.priceHistory.findMany({
    where: {
      medicineId: medicine?.id,
      day: { gte: thirtyDaysAgo }
    },
    orderBy: { day: 'asc' }
  });

  console.log('\n=== PRICE HISTORY (last 30 days) ===');
  console.log('Total entries:', history.length);
  if (history.length > 0) {
    console.log('OLDEST (30 days ago):', history[0].day.toISOString().split('T')[0],
                'avg=', history[0].avgPrice.toString());
    console.log('LATEST:', history[history.length-1].day.toISOString().split('T')[0],
                'avg=', history[history.length-1].avgPrice.toString());

    console.log('\nAll entries:');
    history.forEach(h => {
      console.log(`${h.day.toISOString().split('T')[0]}: avg=${h.avgPrice.toString()}, min=${h.minPrice.toString()}, max=${h.maxPrice.toString()}`);
    });
  }

  // Calculate what the trend SHOULD be
  if (medicine?.listings && medicine.listings.length > 0 && history.length > 0) {
    const currentPrice = Number(medicine.listings[0].listPrice || medicine.listings[0].basePrice);
    const oldestPrice = Number(history[0].avgPrice);
    const change = currentPrice - oldestPrice;
    const changePercent = (change / oldestPrice) * 100;

    console.log('\n=== CORRECT CALCULATION ===');
    console.log('Current Price (lowest listing):', currentPrice);
    console.log('Oldest Price (30 days ago):', oldestPrice);
    console.log('Change:', change);
    console.log('Change %:', changePercent.toFixed(2) + '%');
  }

  await prisma.$disconnect();
}

investigate().catch(console.error);
