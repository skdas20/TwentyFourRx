const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkBevacizumab() {
  try {
    console.log('Searching for bevacizumab in medicine references...\n');
    
    const results = await prisma.medicineReference.findMany({
      where: {
        OR: [
          { composition: { contains: 'bevacizumab', mode: 'insensitive' } },
          { name: { contains: 'bevacizumab', mode: 'insensitive' } },
          { genericName: { contains: 'bevacizumab', mode: 'insensitive' } }
        ]
      },
      take: 10
    });
    
    console.log(`Found ${results.length} medicines with bevacizumab:\n`);
    results.forEach(med => {
      console.log(`Name: ${med.name}`);
      console.log(`Composition: ${med.composition}`);
      console.log(`Generic: ${med.genericName}`);
      console.log(`Manufacturer: ${med.manufacturer}`);
      console.log(`Active: ${med.isActive}`);
      console.log('---');
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBevacizumab();
