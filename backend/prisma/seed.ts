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

  // Seed KYC Document Types
  const kycDocTypes = [
    // Screenshot 1 - Basic Business Documents
    { code: 'GST_CERTIFICATE', label: 'GST Registration Certificate', isRequired: true },
    { code: 'PAN_CARD', label: 'PAN Card', isRequired: true },
    { code: 'FACTORY_LICENSE', label: 'Factory License/ Panchayath/ Corporation Certificate', isRequired: true },
    { code: 'FSSAI_CERTIFICATE', label: 'FSSAI Certificate', isRequired: false },
    { code: 'CANCELLED_CHEQUE', label: 'Cancelled Cheque', isRequired: true },
    { code: 'INDEMNITY_CERTIFICATE', label: 'Indemnity Certificate', isRequired: true },
    { code: 'COMPANY_PROFILE', label: 'Company Profile', isRequired: false },
    { code: 'DRUG_LICENSE_1', label: 'Drug License 1', isRequired: true },
    { code: 'DRUG_LICENSE_2', label: 'Drug License 2', isRequired: false },
    { code: 'DRUG_LICENSE_3', label: 'Drug License 3', isRequired: false },
    { code: 'DRUG_LICENSE_4', label: 'Drug License 4', isRequired: false },

    // Screenshot 2 - Authorization & Quality Documents
    { code: 'MANUFACTURER_AUTH_LETTER', label: 'Manufacturer Authorization Letter', isRequired: true },
    { code: 'MANUFACTURER_AGREEMENT', label: 'Agreement with Manufacturer', isRequired: false },
    { code: 'QUALITY_CERTIFICATIONS', label: 'Quality Certifications (FDA, CE, etc.)', isRequired: false },
    { code: 'INCORPORATION_CERTIFICATE', label: 'Certificate of Incorporation', isRequired: true },
    { code: 'MSE_CERTIFICATE', label: 'MSE Certificate', isRequired: false },
    { code: 'UDYOG_AADHAR', label: 'Udyog Aadhar', isRequired: false },
    { code: 'NSIC_CERTIFICATE', label: 'NSIC/KVIC/UAM Certificate', isRequired: false },

    // Screenshot 3 - Legal & Compliance Documents
    { code: 'NON_CONVICTION_CERTIFICATE', label: 'Non-Conviction Certificate', isRequired: true },
    { code: 'SUPPLY_ORDER', label: 'Supply Order', isRequired: false },
    { code: 'SAMPLE_DECLARATION_FORM', label: 'Sample Declaration Form', isRequired: false },
    { code: 'DECLARATION_FORM', label: 'Declaration Form', isRequired: true },
  ]

  for (const docType of kycDocTypes) {
    await prisma.kycDocumentType.upsert({
      where: { code: docType.code },
      update: { label: docType.label, isRequired: docType.isRequired },
      create: { code: docType.code, label: docType.label, isRequired: docType.isRequired },
    })
  }

  console.log(`Seeded ${kycDocTypes.length} KYC document types`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
