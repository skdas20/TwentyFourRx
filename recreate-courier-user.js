const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const email = 'courier@24rx.in';
  const password = 'courier123';
  const hashedPassword = await bcrypt.hash(password, 10);

  console.log('Generated hash:', hashedPassword);

  // Delete existing user if exists
  await prisma.user.deleteMany({
    where: { email }
  });

  // Create new courier user
  const user = await prisma.user.create({
    data: {
      name: 'Test Courier',
      email: email,
      password: hashedPassword,
      roleCode: 'COURIER',
      status: 'APPROVED',
      isActive: true,
    }
  });

  console.log('Courier user created:', user);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
