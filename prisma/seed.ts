import { PrismaClient } from "@prisma/client";

import { resetDatabase } from "../shared/reset-database";

const prisma = new PrismaClient();

async function main() {
  await resetDatabase(prisma);
  const patientCount = await prisma.patient.count();
  console.log(`Seeded ${patientCount} synthetic patients.`);
}

main()
  .catch((error) => {
    console.error("Failed to seed database", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
