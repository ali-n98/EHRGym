import { NextResponse } from "next/server";

import { prisma } from "../../../../lib/db";
import { resetDatabase } from "../../../../../../shared/reset-database";

export async function POST() {
  await resetDatabase(prisma);

  const patientCount = await prisma.patient.count();

  return NextResponse.json({
    ok: true,
    patientCount
  });
}
