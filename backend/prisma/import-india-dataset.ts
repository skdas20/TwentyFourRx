import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

const prisma = new PrismaClient();

interface CSVRow {
  id: string;
  name: string;
  'price(₹)': string;
  Is_discontinued: string;
  manufacturer_name: string;
  type: string;
  pack_size_label: string;
  short_composition1: string;
  short_composition2: string;
}

async function main() {
  console.log('🚀 Starting India Medicine Dataset Import...\n');

  // Read CSV file
  const csvPath = path.join(__dirname, '../../A_Z_medicines_dataset_of_India.csv');
  console.log(`📂 Reading CSV from: ${csvPath}`);
  
  const fileContent = fs.readFileSync(csvPath, 'utf-8');
  const records: CSVRow[] = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  console.log(`📊 Found ${records.length} medicines in CSV\n`);

  // Clear existing medicine_references data
  console.log('🗑️  Clearing existing medicine_references...');
  const deleted = await prisma.medicineReference.deleteMany({});
  console.log(`   Deleted ${deleted.count} old records\n`);

  // Import in batches
  const batchSize = 1000;
  let imported = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(records.length / batchSize);

    console.log(`📦 Processing batch ${batchNumber}/${totalBatches} (${batch.length} records)...`);

    const medicineData = batch.map((row) => {
      // Extract form from name (e.g., "Tablet", "Syrup", "Capsule")
      const formMatch = row.name.match(/(Tablet|Capsule|Syrup|Injection|Cream|Gel|Solution|Suspension|Drop|Inhaler|Ointment|Lotion|Powder)/i);
      const form = formMatch ? formMatch[1] : 'Tablet';

      // Combine compositions
      let composition = row.short_composition1?.trim() || '';
      if (row.short_composition2?.trim()) {
        composition += composition ? ' + ' + row.short_composition2.trim() : row.short_composition2.trim();
      }
      if (!composition) {
        composition = 'Composition not specified';
      }

      // Extract strength from composition (e.g., "500mg", "10ml")
      const strengthMatch = composition.match(/\(([^)]+)\)/);
      const strength = strengthMatch ? strengthMatch[1] : 'Standard';

      // Generic name (first salt in composition)
      const genericMatch = row.short_composition1?.match(/^([^(]+)/);
      const genericName = genericMatch ? genericMatch[1].trim() : null;

      return {
        name: row.name.trim(),
        genericName,
        composition,
        form,
        strength,
        manufacturer: row.manufacturer_name?.trim() || 'Unknown',
        marketer: null,
        packSize: row.pack_size_label?.trim() || null,
        source: 'india_dataset_csv',
        sourceId: row.id,
        lastScrapedAt: new Date(),
        isActive: row.Is_discontinued?.toUpperCase() !== 'TRUE',
      };
    });

    try {
      // Use createMany for better performance
      const result = await prisma.medicineReference.createMany({
        data: medicineData,
        skipDuplicates: true,
      });
      imported += result.count;
      console.log(`   ✓ Imported ${result.count} medicines`);
    } catch (error: any) {
      console.error(`   ✗ Batch failed: ${error.message}`);
      errors += batch.length;
    }

    // Progress update
    const progress = ((i + batch.length) / records.length * 100).toFixed(1);
    console.log(`   Progress: ${progress}% (${imported + skipped + errors}/${records.length})\n`);
  }

  console.log('✅ Import completed!\n');
  console.log('📊 Summary:');
  console.log(`   Total in CSV: ${records.length}`);
  console.log(`   Imported: ${imported}`);
  console.log(`   Skipped (duplicates): ${skipped}`);
  console.log(`   Errors: ${errors}`);

  // Final count
  const finalCount = await prisma.medicineReference.count();
  console.log(`\n📈 Total medicine references in database: ${finalCount}\n`);

  // Sample records
  console.log('📋 Sample records:');
  const samples = await prisma.medicineReference.findMany({
    take: 5,
    orderBy: { name: 'asc' },
  });
  samples.forEach((med) => {
    console.log(`   - ${med.name} (${med.composition}) - ${med.manufacturer}`);
  });
}

main()
  .catch((error) => {
    console.error('❌ Import failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
