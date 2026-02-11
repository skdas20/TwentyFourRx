
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { name: { contains: 'chandrabhagat', mode: 'insensitive' } },
        { email: { contains: 'chandrabhagat', mode: 'insensitive' } }
      ]
    },
    include: {
      kycDocuments: {
        include: {
          docType: true
        }
      }
    }
  });

  if (user) {
    console.log('USER_FOUND');
    console.log(JSON.stringify(user, null, 2));
  } else {
    console.log('USER_NOT_FOUND');
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
