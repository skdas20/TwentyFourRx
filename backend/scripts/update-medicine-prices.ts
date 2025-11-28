import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

const prisma = new PrismaClient();

async function updateMedicinePrices() {
  console.log('🔄 Starting medicine price update...');
  
  // Read CSV file
  const csvPath = path.join(__dirname, '../../A_Z_medicines_dataset_of_India.csv');
  console.log('📂 Reading CSV from:', csvPath);
  
  if (!fs.existsSync(csvPath)) {
    console.error('❌ CSV file not found at:', csvPath);
    return;
  }
  
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
  });
  
  console.log(`📊 Found ${records.length} records in CSV`);
  
  // Create a map of medicine name -> price
  const priceMap = new Map<string, number>();
  
  for (const record of records) {
    const rec = record as any;
    const name = rec.name?.trim();
    const priceStr = rec['price(₹)'] || rec['price'] || rec['mrp'];
    
    if (name && priceStr) {
      const price = parseFloat(priceStr);
      if (!isNaN(price) && price > 0) {
        priceMap.set(name.toLowerCase(), price);
      }
    }
  }
  
  console.log(`💰 Found ${priceMap.size} medicines with prices`);
  
  // Get all medicine references without prices
  const medicinesWithoutPrice = await prisma.medicineReference.findMany({
    where: {
      mrp: null,
    },
    select: {
      id: true,
      name: true,
    },
  });
  
  console.log(`📋 Found ${medicinesWithoutPrice.length} medicines without prices in database`);
  
  // Update prices in batches
  let updated = 0;
  let notFound = 0;
  const batchSize = 1000;
  
  for (let i = 0; i < medicinesWithoutPrice.length; i += batchSize) {
    const batch = medicinesWithoutPrice.slice(i, i + batchSize);
    
    const updates = batch
      .filter(med => {
        const price = priceMap.get(med.name.toLowerCase());
        return price !== undefined;
      })
      .map(med => {
        const price = priceMap.get(med.name.toLowerCase())!;
        return prisma.medicineReference.update({
          where: { id: med.id },
          data: { mrp: price },
        });
      });
    
    if (updates.length > 0) {
      await prisma.$transaction(updates);
      updated += updates.length;
    }
    
    notFound += batch.length - updates.length;
    
    console.log(`✅ Processed ${Math.min(i + batchSize, medicinesWithoutPrice.length)}/${medicinesWithoutPrice.length} (Updated: ${updated}, Not found: ${notFound})`);
  }
  
  console.log('\n📊 Summary:');
  console.log(`   Total medicines in DB: ${medicinesWithoutPrice.length}`);
  console.log(`   Updated with prices: ${updated}`);
  console.log(`   No price found: ${notFound}`);
  console.log('✅ Done!');
}

updateMedicinePrices()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
