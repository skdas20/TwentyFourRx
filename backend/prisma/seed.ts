import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const roles = [
    { code: 'ADMIN', name: 'Administrator' },
    { code: 'SELLER', name: 'Seller' },
    { code: 'TRADER', name: 'Trader' },
  ]

  for (const r of roles) {
    await prisma.role.upsert({
      where: { code: r.code },
      update: { name: r.name },
      create: { code: r.code, name: r.name },
    })
  }

  console.log('Seeded roles: ADMIN, SELLER, TRADER')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
