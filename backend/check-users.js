const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUsers() {
  const users = await prisma.user.findMany({ select: { email: true, name: true, roleCode: true, status: true } });
  console.log(users);
  await prisma.$disconnect();
}

checkUsers();
