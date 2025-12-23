import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Debugging Dolo-650 Data...');

  // 1. Find the medicine
  const medicine = await prisma.medicine.findFirst({
    where: { name: { contains: 'Dolo', mode: 'insensitive' } },
    include: { 
      priceHistory: true,
      listings: true
    }
  });

  if (!medicine) {
    console.error('❌ Medicine "Dolo-650" not found!');
    return;
  }

  console.log(`✅ Found Medicine: ${medicine.name} (${medicine.id})`);
  
  // 2. Check Price History
  console.log(`📊 Price History Records: ${medicine.priceHistory.length}`);
  if (medicine.priceHistory.length > 0) {
    console.log('   Latest 3 records:');
    medicine.priceHistory.slice(-3).forEach(ph => {
      console.log(`   - Date: ${ph.day.toISOString().split('T')[0]}, Avg: ${ph.avgPrice}, Min: ${ph.minPrice}, Max: ${ph.maxPrice}`);
    });
  } else {
    console.warn('⚠️ No price history found! This explains the empty graph.');
  }

  // 3. Check Listings
  console.log(`📦 Active Listings: ${medicine.listings.length}`);
  medicine.listings.forEach(l => {
    console.log(`   - Seller: ${l.sellerId}, Price: ${l.listPrice}, Status: ${l.status}`);
  });

}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
