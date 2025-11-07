import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding demo users...\n');

  const hashedPassword = await bcrypt.hash('password123', 10);

  // Create Admin
  const admin = await prisma.user.upsert({
    where: { email: 'admin@24rx.com' },
    update: {},
    create: {
      email: 'admin@24rx.com',
      password: hashedPassword,
      name: 'Admin User',
      phone: '+919876543210',
      roleCode: 'ADMIN',
      status: 'APPROVED',
      isActive: true,
    },
  });

  console.log('✅ Admin created:', admin.email);

  // Create Seller
  const seller = await prisma.user.upsert({
    where: { email: 'seller@24rx.com' },
    update: {},
    create: {
      email: 'seller@24rx.com',
      password: hashedPassword,
      name: 'Demo Seller',
      phone: '+919876543211',
      roleCode: 'SELLER',
      status: 'APPROVED',
      isActive: true,
    },
  });

  console.log('✅ Seller created:', seller.email);

  // Create Trader/Buyer
  const trader = await prisma.user.upsert({
    where: { email: 'trader@24rx.com' },
    update: {},
    create: {
      email: 'trader@24rx.com',
      password: hashedPassword,
      name: 'Demo Trader',
      phone: '+919876543212',
      roleCode: 'TRADER',
      status: 'APPROVED',
      isActive: true,
    },
  });

  console.log('✅ Trader created:', trader.email);

  console.log('\n📋 Demo Users Summary:');
  console.log('=====================');
  console.log('Email: admin@24rx.com | Password: password123 | Role: ADMIN');
  console.log('Email: seller@24rx.com | Password: password123 | Role: SELLER');
  console.log('Email: trader@24rx.com | Password: password123 | Role: TRADER');
  console.log('=====================\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
