require('dotenv').config();
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const adminEmail = 'admin@tsu.local';
  const adminPassword = 'Admin123!';
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: 'Administrator',
      email: adminEmail,
      passwordHash,
      role: 'admin',
    },
  });
  console.log(`Seeded admin user: ${adminEmail} / ${adminPassword}`);

  const models = [
    { codePrefix: '5', name: 'Soil Compactor' },
    { codePrefix: '6', name: 'Wheel Loader' },
    { codePrefix: '8', name: 'Track Type Tractor' },
    { codePrefix: '9', name: 'Motor Grader' },
  ];

  for (const model of models) {
    await prisma.gpsModel.upsert({
      where: { codePrefix: model.codePrefix },
      update: { name: model.name },
      create: model,
    });
  }
  console.log('Seeded gps_model (4 rows)');

  const columns = [
    { columnKey: 'materialNumber', displayLabel: 'Material Code', sortOrder: 1 },
    { columnKey: 'description', displayLabel: 'Material Description', sortOrder: 2 },
    { columnKey: 'valuationType', displayLabel: 'Valuation Type', sortOrder: 3 },
    { columnKey: 'pricingDate', displayLabel: 'Pricing Date', sortOrder: 4 },
    { columnKey: 'currency', displayLabel: 'Currency', sortOrder: 5 },
    { columnKey: 'newBeCode', displayLabel: 'New BE Code', sortOrder: 6 },
    { columnKey: 'newCommodityCode', displayLabel: 'New Commodity Code', sortOrder: 7 },
    { columnKey: 'price', displayLabel: 'Current SP', sortOrder: 8 },
    { columnKey: 'remarksForMaterial', displayLabel: 'Remarks for Material', sortOrder: 9 },
    { columnKey: 'replacementPartNo', displayLabel: 'Replacement Part No', sortOrder: 10 },
    { columnKey: 'valTypeForReplacementPartNo', displayLabel: 'Val Type for Replacement Part No', sortOrder: 11 },
  ];

  await prisma.pricingColumnConfig.deleteMany({
    where: { columnKey: { notIn: columns.map((c) => c.columnKey) } },
  });

  for (const col of columns) {
    await prisma.pricingColumnConfig.upsert({
      where: { columnKey: col.columnKey },
      update: { displayLabel: col.displayLabel, sortOrder: col.sortOrder },
      create: { ...col, isVisible: true },
    });
  }
  console.log('Seeded pricing_column_config (11 rows)');

  const featureFlags = [
    { key: 'pricing_export', label: 'Export Excel — Pricing Assistant' },
    { key: 'gps_export', label: 'Export Excel & PDF — Sales GPS' },
  ];

  for (const flag of featureFlags) {
    await prisma.featureFlag.upsert({
      where: { key: flag.key },
      update: { label: flag.label },
      create: { ...flag, enabled: true },
    });
  }
  console.log('Seeded feature_flag (2 rows)');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
