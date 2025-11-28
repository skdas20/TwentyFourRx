import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

const prisma = new PrismaClient();

async function updatePricesWithSQL() {
  console.log('🔄 Starting medicine price update (SQL method)...');
  
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
  
  // Create temporary table and bulk insert prices
  console.log('📝 Creating temporary price table...');
  
  await prisma.$executeRawUnsafe(`
    CREATE TEMP TABLE IF NOT EXISTS temp_prices (
      name TEXT,
      price DECIMAL(14, 2)
    )
  `);
  
  // Insert prices in batches
  const batchSize = 5000;
  let inserted = 0;
  
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    
    const values = batch
      .filter((r: any) => r.name && (r['price(₹)'] || r['price'] || r['mrp']))
      .map((r: any) => {
        const name = r.name.replace(/'/g, "''"); // Escape single quotes
        const price = parseFloat(r['price(₹)'] || r['price'] || r['mrp'] || '0');
        return `('${name}', ${price})`;
      })
      .join(',');
    
    if (values) {
      await prisma.$executeRawUnsafe(`
        INSERT INTO temp_prices (name, price) VALUES ${values}
      `);
      inserted += batch.length;
    }
    
    console.log(`📥 Inserted ${Math.min(i + batchSize, records.length)}/${records.length} prices`);
  }
  
  console.log(`✅ Inserted ${inserted} prices into temp table`);
  
  // Update medicine_references with prices
  console.log('🔄 Updating medicine_references with prices...');
  
  const result = await prisma.$executeRawUnsafe(`
    UPDATE medicine_references mr
    SET mrp = tp.price
    FROM temp_prices tp
    WHERE LOWER(mr.name) = LOWER(tp.name)
    AND mr.mrp IS NULL
  `);
  
  console.log(`✅ Updated ${result} medicine references with prices`);
  
  // Cleanup
  await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS temp_prices`);
  
  // Get stats
  const totalCount = await prisma.medicineReference.count();
  const withPriceCount = await prisma.medicineReference.count({
    where: { mrp: { not: null } },
  });
  const withoutPriceCount = await prisma.medicineReference.count({
    where: { mrp: null },
  });
  
  console.log('\n📊 Final Statistics:');
  console.log(`   Total medicines: ${totalCount}`);
  console.log(`   With prices: ${withPriceCount}`);
  console.log(`   Without prices: ${withoutPriceCount}`);
  console.log(`   Coverage: ${((withPriceCount / totalCount) * 100).toFixed(2)}%`);
  console.log('✅ Done!');
}

updatePricesWithSQL()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
