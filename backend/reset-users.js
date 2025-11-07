const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function reset() {
  await prisma.user.deleteMany({});
  console.log('Deleted all users');
  const hash = await bcrypt.hash('password123', 10);
  console.log('Hash:', hash);
  const admin = await prisma.user.create({ data: { email: 'admin@24rx.com', password: hash, name: 'Admin User', phone: '+919876543210', roleCode: 'ADMIN', status: 'APPROVED', isActive: true } });
  console.log('Created admin:', admin.email);
  await prisma.$disconnect();
}
reset();
