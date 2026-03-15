const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const courier = await prisma.user.findUnique({
    where: { email: 'courier@24rx.in' }
  });
  
  console.log('Courier user:', JSON.stringify(courier, null, 2));
  
  if (!courier) {
    console.log('\n❌ Courier user not found!');
  } else {
    console.log('\n✅ Courier user exists');
    console.log('Email:', courier.email);
    console.log('Role:', courier.roleCode);
    console.log('Status:', courier.status);
    console.log('Active:', courier.isActive);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
