import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

const client = axios.create({
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'application/json',
  },
  timeout: 15000,
});

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function scrapeTerm(term: string): Promise<number> {
  try {
    console.log(`Scraping "${term}"...`);
    const response = await client.get(
      'https://www.1mg.com/pharmacy_api_gateway/v4/drug_skus/by_prefix',
      { params: { prefix_term: term } }
    );

    const medicines = response.data?.data || [];
    let scraped = 0;

    for (const med of medicines) {
      try {
        const name = med.name || 'Unknown';
        const form = med.form || 'Tablet';
        const strength = med.strength || '';
        const manufacturer = med.manufacturer_name || med.manufacturer || 'Unknown';
        const composition = med.salt_composition || med.composition || med.generic_name || name;

        if (!name || name === 'Unknown') continue;

        await prisma.medicineReference.upsert({
          where: {
            uq_medicine_ref: { name, form, strength, manufacturer },
          },
          create: {
            name,
            genericName: med.generic_name || null,
            composition,
            form,
            strength,
            manufacturer,
            marketer: med.marketer_name || med.marketer || null,
            packSize: med.pack_size_label || med.pack_size || null,
            source: '1mg',
            sourceId: med.id?.toString() || med.sku_id?.toString() || null,
            lastScrapedAt: new Date(),
            isActive: true,
          },
          update: {
            genericName: med.generic_name || null,
            composition,
            marketer: med.marketer_name || med.marketer || null,
            packSize: med.pack_size_label || med.pack_size || null,
            lastScrapedAt: new Date(),
          },
        });
        scraped++;
      } catch (error: any) {
        if (!error.message.includes('Unique constraint')) {
          console.warn(`  Failed to upsert ${med.name}: ${error.message}`);
        }
      }
    }

    console.log(`  ✓ Scraped ${scraped} medicines from "${term}"`);
    return scraped;
  } catch (error: any) {
    console.error(`  ✗ Failed to scrape "${term}": ${error.message}`);
    return 0;
  }
}

async function main() {
  console.log('🚀 Starting medicine data scraping...\n');

  const searchTerms = [
    // Popular medicines
    'paracetamol', 'dolo', 'crocin', 'ibuprofen', 'aspirin',
    'amoxicillin', 'azithromycin', 'ciprofloxacin',
    'metformin', 'atorvastatin', 'omeprazole', 'pantoprazole',
    'cetirizine', 'combiflam', 'calpol', 'sinarest',
    
    // Alphabetic for broader coverage
    'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j',
    'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't',
    'u', 'v', 'w', 'x', 'y', 'z',
  ];

  let totalScraped = 0;
  const batchSize = 5;

  for (let i = 0; i < searchTerms.length; i += batchSize) {
    const batch = searchTerms.slice(i, i + batchSize);
    
    const counts = await Promise.all(
      batch.map((term) => scrapeTerm(term))
    );
    
    totalScraped += counts.reduce((sum, count) => sum + count, 0);
    
    // Respectful delay between batches
    if (i + batchSize < searchTerms.length) {
      console.log('  Waiting 2s before next batch...\n');
      await delay(2000);
    }
  }

  console.log(`\n✅ Scraping completed! Total medicines: ${totalScraped}`);
  
  const stats = await prisma.medicineReference.aggregate({
    _count: true,
  });
  console.log(`📊 Database total: ${stats._count} medicine references\n`);
}

main()
  .catch((error) => {
    console.error('❌ Scraping failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
