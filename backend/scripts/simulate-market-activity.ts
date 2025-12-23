import {
    PrismaClient
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('🚀 Starting market simulation...');

    // 1. Get or Create Target Medicine
    // We'll look for a common medicine or create one if it doesn't exist
    let medicine = await prisma.medicine.findFirst({
        where: {
            name: 'Dolo-650'
        },
        include: {
            manufacturer: true
        },
    });

    if (!medicine) {
        // Check if manufacturer exists
        let manufacturer = await prisma.manufacturer.findFirst({
            where: {
                name: 'Micro Labs Ltd'
            },
        });

        if (!manufacturer) {
            manufacturer = await prisma.manufacturer.create({
                data: {
                    name: 'Micro Labs Ltd',
                    country: 'India',
                },
            });
            console.log('✅ Created Manufacturer: Micro Labs Ltd');
        }

        medicine = await prisma.medicine.create({
            data: {
                name: 'Dolo-650',
                form: 'Tablet',
                strength: '650mg',
                manufacturerId: manufacturer.id,
                imageUrl: 'https://5.imimg.com/data5/SELLER/Default/2023/7/326678233/SX/QZ/SS/193279077/dolo-650-mg-tablet-500x500.jpg',
            },
            include: {
                manufacturer: true
            },
        });
        console.log('✅ Created Medicine: Dolo-650');
    } else {
        console.log(`ℹ️ Using existing medicine: ${medicine.name}`);
    }

      // 2. Create Dummy Sellers
      const sellers: any[] = [];
      const sellerNames = ['Apex Pharma', 'MediCorp Distributors', 'Global Health Traders'];
    // Use a default role code for sellers
    // Ensure the role exists
    let sellerRole = await prisma.role.findUnique({
        where: {
            code: 'SELLER'
        }
    });
    if (!sellerRole) {
        // Fallback if SELLER role not found, though it should exist
        sellerRole = await prisma.role.create({
            data: {
                code: 'SELLER',
                name: 'Seller'
            }
        });
    }

    const passwordHash = await bcrypt.hash('password123', 10);

    for (const name of sellerNames) {
        const email = `${name.toLowerCase().replace(/\s+/g, '')}@example.com`;
        let seller = await prisma.user.findUnique({
            where: {
                email
            }
        });

        if (!seller) {
            seller = await prisma.user.create({
                data: {
                    name,
                    email,
                    password: passwordHash,
                    roleCode: 'SELLER',
                    status: 'APPROVED',
                    isActive: true,
                },
            });
            console.log(`✅ Created Seller: ${name}`);
        } else {
            console.log(`ℹ️ Seller exists: ${name}`);
        }
        sellers.push(seller);
    }

    // 3. Simulate Price History (Past 30 Days)
    // We want a curve: Start around 30, dip to 28, rise to 35, stabilize at 32
    const basePrice = 30;
    const volatility = 0.15; // 15% volatility

    console.log('📊 Generating price history...');

    // Clean existing history for this medicine to avoid duplicates/messy graph
    await prisma.priceHistory.deleteMany({
        where: {
            medicineId: medicine.id
        },
    });

      const historyData: any[] = [];
      let currentTrendPrice = basePrice;
    for (let i = 30; i >= 1; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);

        // Random walk
        const change = (Math.random() - 0.5) * volatility * currentTrendPrice;
        currentTrendPrice += change;

        // Ensure reasonable bounds
        currentTrendPrice = Math.max(20, Math.min(50, currentTrendPrice));

        // Generate daily stats based on this trend price
        const minPrice = currentTrendPrice * (0.95 + Math.random() * 0.03); // Slightly lower
        const maxPrice = currentTrendPrice * (1.02 + Math.random() * 0.03); // Slightly higher
        const avgPrice = (minPrice + maxPrice) / 2;

        historyData.push({
            medicineId: medicine.id,
            day: date,
            minPrice,
            maxPrice,
            avgPrice,
        });
    }

    await prisma.priceHistory.createMany({
        data: historyData,
    });
    console.log(`✅ Inserted ${historyData.length} days of price history`);

    // 4. Create Active Listings (Current Market State)
    // Create listings with slightly different prices to show "Depth"
    console.log('📦 Creating active listings...');

    // Clear existing active listings for this medicine by these test sellers
    await prisma.listing.deleteMany({
        where: {
            medicineId: medicine.id,
            sellerId: {
                in: sellers.map(s => s.id)
            }
        }
    });

    const currentMarketPrice = currentTrendPrice;

    for (const seller of sellers) {
        // Each seller lists at a slightly different price around the current market price
        const variation = (Math.random() - 0.5) * 4; // +/- 2 rupees
        const listPrice = currentMarketPrice + variation;
        const stock = Math.floor(Math.random() * 500) + 50;

        await prisma.listing.create({
            data: {
                medicineId: medicine.id,
                sellerId: seller.id,
                basePrice: listPrice * 0.8, // Base price lower than list price
                listPrice: listPrice,
                stock: stock,
                status: 'ACTIVE',
                adminMarkupPct: 5,
                expiryDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)), // 1 year expiry
                batchNo: `BATCH-${Math.floor(Math.random() * 10000)}`
            }
        });
        console.log(`   -> Listing by ${seller.name}: ₹${listPrice.toFixed(2)} (${stock} units)`);
    }

    console.log('\n✨ Simulation Complete!');
    console.log(`👉 Check the Medicine Detail Page for: ${medicine.name}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
