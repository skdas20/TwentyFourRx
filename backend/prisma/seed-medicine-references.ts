import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Popular Indian medicines data - manually curated
const medicineData = [
  // Paracetamol brands
  {
    name: 'Dolo 650 Tablet',
    genericName: 'Paracetamol',
    composition: 'Paracetamol 650mg',
    form: 'Tablet',
    strength: '650mg',
    manufacturer: 'Micro Labs Ltd',
    packSize: '15 tablets',
  },
  {
    name: 'Crocin 650 Advance Tablet',
    genericName: 'Paracetamol',
    composition: 'Paracetamol 650mg',
    form: 'Tablet',
    strength: '650mg',
    manufacturer: 'GSK Consumer Healthcare',
    packSize: '15 tablets',
  },
  {
    name: 'Calpol 500mg Tablet',
    genericName: 'Paracetamol',
    composition: 'Paracetamol 500mg',
    form: 'Tablet',
    strength: '500mg',
    manufacturer: 'GSK Pharmaceuticals Ltd',
    packSize: '15 tablets',
  },
  {
    name: 'Paracetamol 500mg Tablet',
    genericName: 'Paracetamol',
    composition: 'Paracetamol 500mg',
    form: 'Tablet',
    strength: '500mg',
    manufacturer: 'Various',
    packSize: '10 tablets',
  },

  // Ibuprofen brands
  {
    name: 'Brufen 400mg Tablet',
    genericName: 'Ibuprofen',
    composition: 'Ibuprofen 400mg',
    form: 'Tablet',
    strength: '400mg',
    manufacturer: 'Abbott Healthcare',
    packSize: '15 tablets',
  },
  {
    name: 'Combiflam Tablet',
    genericName: 'Ibuprofen + Paracetamol',
    composition: 'Ibuprofen 400mg + Paracetamol 325mg',
    form: 'Tablet',
    strength: '400mg+325mg',
    manufacturer: 'Sanofi India Ltd',
    packSize: '20 tablets',
  },

  // Antibiotics
  {
    name: 'Augmentin 625 Duo Tablet',
    genericName: 'Amoxicillin + Clavulanic Acid',
    composition: 'Amoxicillin 500mg + Clavulanic Acid 125mg',
    form: 'Tablet',
    strength: '500mg+125mg',
    manufacturer: 'GSK Pharmaceuticals Ltd',
    packSize: '10 tablets',
  },
  {
    name: 'Azithral 500 Tablet',
    genericName: 'Azithromycin',
    composition: 'Azithromycin 500mg',
    form: 'Tablet',
    strength: '500mg',
    manufacturer: 'Alembic Pharmaceuticals Ltd',
    packSize: '3 tablets',
  },
  {
    name: 'Cipla Ciprofloxacin 500mg Tablet',
    genericName: 'Ciprofloxacin',
    composition: 'Ciprofloxacin 500mg',
    form: 'Tablet',
    strength: '500mg',
    manufacturer: 'Cipla Ltd',
    packSize: '10 tablets',
  },
  {
    name: 'Moxikind-CV 625 Tablet',
    genericName: 'Amoxicillin + Clavulanic Acid',
    composition: 'Amoxicillin 500mg + Clavulanic Acid 125mg',
    form: 'Tablet',
    strength: '500mg+125mg',
    manufacturer: 'Mankind Pharma Ltd',
    packSize: '10 tablets',
  },

  // Diabetes
  {
    name: 'Glycomet 500mg Tablet',
    genericName: 'Metformin',
    composition: 'Metformin Hydrochloride 500mg',
    form: 'Tablet',
    strength: '500mg',
    manufacturer: 'USV Ltd',
    packSize: '20 tablets',
  },
  {
    name: 'Metformin 850mg Tablet',
    genericName: 'Metformin',
    composition: 'Metformin Hydrochloride 850mg',
    form: 'Tablet',
    strength: '850mg',
    manufacturer: 'Sun Pharma',
    packSize: '10 tablets',
  },

  // Cholesterol
  {
    name: 'Atorva 10mg Tablet',
    genericName: 'Atorvastatin',
    composition: 'Atorvastatin 10mg',
    form: 'Tablet',
    strength: '10mg',
    manufacturer: 'Zydus Cadila',
    packSize: '15 tablets',
  },
  {
    name: 'Lipitor 20mg Tablet',
    genericName: 'Atorvastatin',
    composition: 'Atorvastatin 20mg',
    form: 'Tablet',
    strength: '20mg',
    manufacturer: 'Pfizer Ltd',
    packSize: '10 tablets',
  },

  // Antacids
  {
    name: 'Pan 40 Tablet',
    genericName: 'Pantoprazole',
    composition: 'Pantoprazole 40mg',
    form: 'Tablet',
    strength: '40mg',
    manufacturer: 'Alkem Laboratories Ltd',
    packSize: '15 tablets',
  },
  {
    name: 'Omez 20 Capsule',
    genericName: 'Omeprazole',
    composition: 'Omeprazole 20mg',
    form: 'Capsule',
    strength: '20mg',
    manufacturer: 'Dr Reddys Laboratories Ltd',
    packSize: '15 capsules',
  },
  {
    name: 'Pantocid 40mg Tablet',
    genericName: 'Pantoprazole',
    composition: 'Pantoprazole Sodium 40mg',
    form: 'Tablet',
    strength: '40mg',
    manufacturer: 'Sun Pharma',
    packSize: '10 tablets',
  },

  // Antihistamines
  {
    name: 'Cetrizine 10mg Tablet',
    genericName: 'Cetirizine',
    composition: 'Cetirizine Dihydrochloride 10mg',
    form: 'Tablet',
    strength: '10mg',
    manufacturer: 'Various',
    packSize: '10 tablets',
  },
  {
    name: 'Allegra 120mg Tablet',
    genericName: 'Fexofenadine',
    composition: 'Fexofenadine 120mg',
    form: 'Tablet',
    strength: '120mg',
    manufacturer: 'Sanofi India Ltd',
    packSize: '10 tablets',
  },

  // Cold & Cough
  {
    name: 'Sinarest Tablet',
    genericName: 'Paracetamol + Phenylephrine + Chlorpheniramine',
    composition: 'Paracetamol 500mg + Phenylephrine 10mg + Chlorpheniramine 2mg',
    form: 'Tablet',
    strength: '500mg+10mg+2mg',
    manufacturer: 'Centaur Pharmaceuticals',
    packSize: '15 tablets',
  },
  {
    name: 'Vicks Action 500 Tablet',
    genericName: 'Paracetamol + Phenylephrine + Chlorpheniramine',
    composition: 'Paracetamol 500mg + Phenylephrine 5mg + Chlorpheniramine 2mg',
    form: 'Tablet',
    strength: '500mg+5mg+2mg',
    manufacturer: 'Procter & Gamble',
    packSize: '10 tablets',
  },

  // Vitamins & Supplements
  {
    name: 'Shelcal 500 Tablet',
    genericName: 'Calcium + Vitamin D3',
    composition: 'Calcium Carbonate 1250mg (eq to Calcium 500mg) + Vitamin D3 250 IU',
    form: 'Tablet',
    strength: '500mg+250IU',
    manufacturer: 'Torrent Pharmaceuticals Ltd',
    packSize: '15 tablets',
  },
  {
    name: 'Becosules Capsule',
    genericName: 'Vitamin B Complex',
    composition: 'Vitamin B Complex + Vitamin C',
    form: 'Capsule',
    strength: 'Standard',
    manufacturer: 'Pfizer Ltd',
    packSize: '20 capsules',
  },

  // Antiseptics
  {
    name: 'Betadine 10% Solution',
    genericName: 'Povidone Iodine',
    composition: 'Povidone Iodine 10% w/v',
    form: 'Solution',
    strength: '10%',
    manufacturer: 'Win-Medicare Pvt Ltd',
    packSize: '100ml',
  },
  {
    name: 'Dettol Antiseptic Liquid',
    genericName: 'Chloroxylenol',
    composition: 'Chloroxylenol 4.8% w/v',
    form: 'Solution',
    strength: '4.8%',
    manufacturer: 'Reckitt Benckiser',
    packSize: '125ml',
  },

  // Antifungals
  {
    name: 'Candid Cream',
    genericName: 'Clotrimazole',
    composition: 'Clotrimazole 1% w/w',
    form: 'Cream',
    strength: '1%',
    manufacturer: 'Glenmark Pharmaceuticals Ltd',
    packSize: '30g',
  },

  // Pain Relief
  {
    name: 'Volini Gel',
    genericName: 'Diclofenac',
    composition: 'Diclofenac Diethylamine 1.16% w/w',
    form: 'Gel',
    strength: '1.16%',
    manufacturer: 'Ranbaxy Laboratories Ltd',
    packSize: '75g',
  },
  {
    name: 'Aspirin 75mg Tablet',
    genericName: 'Aspirin',
    composition: 'Aspirin 75mg',
    form: 'Tablet',
    strength: '75mg',
    manufacturer: 'Various',
    packSize: '14 tablets',
  },

  // Antidiabetic
  {
    name: 'Januvia 100mg Tablet',
    genericName: 'Sitagliptin',
    composition: 'Sitagliptin Phosphate 100mg',
    form: 'Tablet',
    strength: '100mg',
    manufacturer: 'MSD Pharmaceuticals',
    packSize: '10 tablets',
  },

  // Thyroid
  {
    name: 'Thyronorm 50mcg Tablet',
    genericName: 'Levothyroxine',
    composition: 'Levothyroxine Sodium 50mcg',
    form: 'Tablet',
    strength: '50mcg',
    manufacturer: 'Abbott Healthcare',
    packSize: '100 tablets',
  },
];

async function main() {
  console.log('🌱 Seeding medicine reference data...\n');

  let created = 0;
  let skipped = 0;

  for (const medicine of medicineData) {
    try {
      await prisma.medicineReference.create({
        data: {
          name: medicine.name,
          genericName: medicine.genericName,
          composition: medicine.composition,
          form: medicine.form,
          strength: medicine.strength,
          manufacturer: medicine.manufacturer,
          marketer: null,
          packSize: medicine.packSize,
          source: 'manual_seed',
          sourceId: null,
          lastScrapedAt: new Date(),
          isActive: true,
        },
      });
      console.log(`✓ Added: ${medicine.name}`);
      created++;
    } catch (error: any) {
      if (error.code === 'P2002') {
        console.log(`⚠ Skipped (duplicate): ${medicine.name}`);
        skipped++;
      } else {
        console.error(`✗ Failed: ${medicine.name} - ${error.message}`);
      }
    }
  }

  console.log(`\n✅ Seeding completed!`);
  console.log(`   Created: ${created}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Total: ${medicineData.length}\n`);

  const stats = await prisma.medicineReference.count();
  console.log(`📊 Total medicine references in database: ${stats}\n`);
}

main()
  .catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
