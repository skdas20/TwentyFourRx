const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
  const email = 'courier@24rx.in';
  const password = 'courier123';
  const hashedPassword = await bcrypt.hash(password, 10);
  
  // First check if COURIER role exists
  const courierRole = await prisma.role.findUnique({
    where: { code: 'COURIER' }
  });
  
  if (!courierRole) {
    console.log('Creating COURIER role...');
    await prisma.role.create({
      data: {
        code: 'COURIER',
        name: 'Courier Partner'
      }
    });
  }
  
  // Create or update courier user
  const courier = await prisma.user.upsert({
    where: { email },
    update: {
      password: hashedPassword,
      roleCode: 'COURIER',
      status: 'APPROVED',
      isActive: true
    },
    create: {
      email,
      name: 'Courier Partner',
      password: hashedPassword,
      roleCode: 'COURIER',
      status: 'APPROVED',
      isActive: true
    }
  });
  
  console.log('✅ Courier user created/updated:');
  console.log('Email:', courier.email);
  console.log('Password: courier123');
  console.log('Role:', courier.roleCode);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
