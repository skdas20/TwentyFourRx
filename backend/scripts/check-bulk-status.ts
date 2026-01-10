
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Checking Bulk Listing Requests ---');
  const requests = await prisma.bulkListingRequest.findMany({
    include: { seller: true },
    orderBy: { createdAt: 'desc' },
  });

  if (requests.length === 0) {
    console.log('No bulk listing requests found in the database.');
  } else {
    console.log(`Found ${requests.length} requests:`);
    requests.forEach(req => {
      console.log(`- ID: ${req.id}`);
      console.log(`  Seller: ${req.seller.name} (${req.seller.email})`);
      console.log(`  Status: ${req.status}`);
      console.log(`  Created: ${req.createdAt}`);
      console.log(`  Parsed Items: ${Array.isArray(req.parsedData) ? (req.parsedData as any[]).length : 'None'}`);
      console.log('---');
    });
  }

  console.log('\n--- Checking Admin Users ---');
  const admins = await prisma.user.findMany({
    where: { roleCode: 'ADMIN' },
  });
  
  if (admins.length === 0) {
    console.log('WARNING: No users with roleCode="ADMIN" found.');
  } else {
    console.log(`Found ${admins.length} Admin users:`);
    admins.forEach(admin => console.log(`- ${admin.name} (${admin.email})`));
  }

  console.log('\n--- Checking User SK DAS ---');
  const skDas = await prisma.user.findFirst({
      where: { email: 'admin.24rx@24rxexchange.com' }
  });
  if (skDas) {
      console.log(`SK DAS Role: ${skDas.roleCode}`);
  } else {
      console.log('User SK DAS not found');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
