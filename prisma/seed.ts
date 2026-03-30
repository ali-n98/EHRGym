import { PrismaClient } from "@prisma/client";

import { resetDatabase } from "../shared/reset-database";

const prisma = new PrismaClient();

async function main() {
  const result = await resetDatabase(prisma);
  console.log(`Seeded ${result.patientCount} synthetic patients.`);
  console.log(`Seeded ${result.orderCatalogCount} order catalog rows from CSV.`);
  console.log(`Seeded ${result.problemCatalogCount} problem catalog rows from CSV.`);
  console.log(`Seeded ${result.diagnosisCatalogCount} diagnosis catalog rows from CSV.`);
}

main()
  .catch((error) => {
    console.error("Failed to seed database", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
