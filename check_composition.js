const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkComposition() {
  try {
    const medicines = await prisma.medicine.findMany({
      take: 10,
      select: {
        id: true,
        name: true,
        composition: true
      }
    });
    
    console.log('=== First 10 Medicines ===');
    medicines.forEach(med => {
      console.log('ID:', med.id);
      console.log('Name:', med.name);
      console.log('Composition:', med.composition || 'NULL');
      console.log('---');
    });
    
    const totalCount = await prisma.medicine.count();
    const withComposition = await prisma.medicine.count({
      where: {
        composition: { not: null }
      }
    });
    
    console.log('\nTotal medicines:', totalCount);
    console.log('With composition:', withComposition);
    console.log('Without composition:', totalCount - withComposition);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkComposition();
