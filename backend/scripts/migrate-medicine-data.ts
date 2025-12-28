import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateMedicineData() {
  console.log('Starting medicine data migration...');

  try {
    // Get all medicines without composition data
    const medicines = await prisma.medicine.findMany({
      where: {
        OR: [
          { composition: null },
          { genericName: null },
        ],
      },
      include: {
        manufacturer: true,
        marketer: true,
      },
    });

    console.log(`Found ${medicines.length} medicines to update`);

    let updated = 0;
    let notFound = 0;

    for (const medicine of medicines) {
      // Try to find matching medicine reference
      const reference = await prisma.medicineReference.findFirst({
        where: {
          name: {
            equals: medicine.name,
            mode: 'insensitive',
          },
          form: {
            equals: medicine.form,
            mode: 'insensitive',
          },
          strength: {
            equals: medicine.strength,
            mode: 'insensitive',
          },
          manufacturer: {
            equals: medicine.manufacturer.name,
            mode: 'insensitive',
          },
        },
      });

      if (reference) {
        // Update medicine with reference data
        await prisma.medicine.update({
          where: { id: medicine.id },
          data: {
            genericName: reference.genericName,
            composition: reference.composition,
            packSize: reference.packSize,
            mrp: reference.mrp,
          },
        });
        updated++;
        console.log(`✓ Updated: ${medicine.name} (${medicine.form} ${medicine.strength})`);
      } else {
        notFound++;
        console.log(`✗ No reference found for: ${medicine.name} (${medicine.form} ${medicine.strength})`);

        // Set composition to name as fallback
        await prisma.medicine.update({
          where: { id: medicine.id },
          data: {
            composition: medicine.name,
            genericName: medicine.name.split(' ')[0], // First word as generic name
          },
        });
      }
    }

    console.log('\n=== Migration Summary ===');
    console.log(`Total medicines processed: ${medicines.length}`);
    console.log(`Successfully updated: ${updated}`);
    console.log(`Not found in references: ${notFound}`);
    console.log('Migration completed!');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

migrateMedicineData()
  .then(() => {
    console.log('Script finished successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
