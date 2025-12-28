const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testSuggestions() {
  try {
    console.log('=== Testing MedicineReference Table ===\n');

    // Count total records
    const count = await prisma.medicineReference.count();
    console.log(`Total records: ${count}\n`);

    // Get sample records
    const samples = await prisma.medicineReference.findMany({
      take: 5,
      select: {
        id: true,
        name: true,
        composition: true,
        manufacturer: true,
        form: true,
        strength: true,
        genericName: true,
        packSize: true,
        marketer: true,
      }
    });

    console.log('Sample records:');
    samples.forEach((record, i) => {
      console.log(`\n${i + 1}. ${record.name}`);
      console.log(`   Composition: ${record.composition}`);
      console.log(`   Manufacturer: ${record.manufacturer}`);
      console.log(`   Form: ${record.form}`);
      console.log(`   Strength: ${record.strength}`);
    });

    // Test name suggestions
    console.log('\n=== Testing Name Suggestions (empty query) ===');
    const nameResults = await prisma.medicineReference.findMany({
      where: {},
      select: { name: true },
      distinct: ['name'],
      take: 10,
      orderBy: { name: 'asc' },
    });
    const names = Array.from(new Set(nameResults.map(r => r.name).filter(v => v != null && v !== ''))).sort();
    console.log(`Found ${names.length} unique names:`, names);

    // Test with query 'a'
    console.log('\n=== Testing Name Suggestions (query: "a") ===');
    const nameResultsWithA = await prisma.medicineReference.findMany({
      where: {
        name: { contains: 'a', mode: 'insensitive' }
      },
      select: { name: true },
      distinct: ['name'],
      take: 10,
      orderBy: { name: 'asc' },
    });
    const namesWithA = Array.from(new Set(nameResultsWithA.map(r => r.name).filter(v => v != null && v !== ''))).sort();
    console.log(`Found ${namesWithA.length} names containing 'a':`, namesWithA);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testSuggestions();
