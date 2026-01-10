
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin.24rx@24rxexchange.com';
  console.log(`Promoting user ${email} to ADMIN...`);
  
  const user = await prisma.user.findFirst({ where: { email } });
  if (!user) {
    console.log('User not found.');
    return;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { roleCode: 'ADMIN' },
  });
  
  console.log('User promoted successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
