import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Fixing Dolo-650 Price History...');

  // 1. Get Medicine
  const medicine = await prisma.medicine.findFirst({
    where: { name: { contains: 'Dolo', mode: 'insensitive' } },
  });

  if (!medicine) {
    console.error('❌ Medicine not found!');
    return;
  }

  console.log(`✅ Targeted Medicine: ${medicine.name} (${medicine.id})`);

  // 2. Clear OLD history
  const deleted = await prisma.priceHistory.deleteMany({
    where: { medicineId: medicine.id },
  });
  console.log(`🗑️ Cleared ${deleted.count} old history records.`);

  // 3. Generate NEW history (Past 30 Days) with explicit variations
  const historyData: Prisma.PriceHistoryCreateManyInput[] = [];
  let price = 20.0; // Start price

  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0); // Normalize time

    // Create variation
    const change = (Math.random() - 0.45) * 1.5; // Slight upward trend bias
    price += change;
    
    // Bounds
    price = Math.max(18, Math.min(25, price));

    const minPrice = price * 0.98;
    const maxPrice = price * 1.02;
    const avgPrice = price;

    historyData.push({
      medicineId: medicine.id,
      day: date,
      minPrice,
      maxPrice,
      avgPrice,
    });
  }

  const created = await prisma.priceHistory.createMany({
    data: historyData,
  });

  console.log(`✅ Created ${created.count} new history records.`);
  console.log('   Range: ~18.00 to ~25.00');
  console.log('   Last Record:', historyData[historyData.length - 1]);

  // 4. Update Listing Price to match trend
  const latestPriceValue = Number(historyData[historyData.length - 1].avgPrice);
  const latestPrice = new Prisma.Decimal(latestPriceValue);
  await prisma.listing.updateMany({
    where: { medicineId: medicine.id, status: 'ACTIVE' },
    data: { 
      listPrice: latestPrice,
      basePrice: latestPrice.mul(0.9),
    },
  });
  console.log(`✅ Updated active listings to match latest price: ${latestPrice.toFixed(2)}`);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
