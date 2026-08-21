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
    { columnKey: 'materialNumber', displayLabel: 'Material No', sortOrder: 1 },
    { columnKey: 'description', displayLabel: 'Description', sortOrder: 2 },
    { columnKey: 'price', displayLabel: 'Price', sortOrder: 3 },
    { columnKey: 'discount', displayLabel: 'Discount', sortOrder: 4 },
    { columnKey: 'netPrice', displayLabel: 'Net Price', sortOrder: 5 },
    { columnKey: 'currency', displayLabel: 'Currency', sortOrder: 6 },
    { columnKey: 'plant', displayLabel: 'Plant', sortOrder: 7 },
    { columnKey: 'stock', displayLabel: 'Stock', sortOrder: 8 },
    { columnKey: 'status', displayLabel: 'Status', sortOrder: 9 },
    { columnKey: 'category', displayLabel: 'Category', sortOrder: 10 },
    { columnKey: 'effectiveDate', displayLabel: 'Effective Date', sortOrder: 11 },
  ];

  for (const col of columns) {
    await prisma.pricingColumnConfig.upsert({
      where: { columnKey: col.columnKey },
      update: {},
      create: { ...col, isVisible: true },
    });
  }
  console.log('Seeded pricing_column_config (11 rows)');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
