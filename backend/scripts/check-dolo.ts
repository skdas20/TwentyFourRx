import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDolo() {
  console.log('\n=== Searching for Dolo 650 ===\n');

  // Check in medicine references
  const refs = await prisma.medicineReference.findMany({
    where: {
      name: { contains: 'Dolo', mode: 'insensitive' }
    },
    take: 5
  });

  console.log('Medicine References:');
  refs.forEach(ref => {
    console.log(`  - Name: "${ref.name}"`);
    console.log(`    Form: "${ref.form}"`);
    console.log(`    Strength: "${ref.strength}"`);
    console.log(`    Manufacturer: "${ref.manufacturer}"`);
    console.log('');
  });

  // Check in active medicines
  const meds = await prisma.medicine.findMany({
    where: {
      name: { contains: 'Dolo', mode: 'insensitive' }
    },
    include: { manufacturer: true },
    take: 5
  });

  console.log('\nActive Medicines:');
  meds.forEach(med => {
    console.log(`  - Name: "${med.name}"`);
    console.log(`    Form: "${med.form}"`);
    console.log(`    Strength: "${med.strength}"`);
    console.log(`    Manufacturer: "${med.manufacturer?.name}"`);
    console.log('');
  });

  await prisma.$disconnect();
}

checkDolo();
