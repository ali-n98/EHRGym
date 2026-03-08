import { NextResponse } from "next/server";

import { parseJsonValue } from "../../../lib/chart";
import { prisma } from "../../../lib/db";

export async function GET() {
  const patients = await prisma.patient.findMany({
    orderBy: { fullName: "asc" },
    include: {
      encounters: {
        take: 1,
        orderBy: { startedAt: "desc" }
      },
      scenarios: {
        take: 1,
        orderBy: { createdAt: "desc" }
      }
    }
  });

  return NextResponse.json({
    patients: patients.map((patient) => ({
      id: patient.id,
      mrn: patient.mrn,
      fullName: patient.fullName,
      age: patient.age,
      sex: patient.sex,
      allergies: parseJsonValue<string[]>(patient.allergiesJson),
      bannerFlags: parseJsonValue<string[]>(patient.bannerFlagsJson),
      summary: patient.summary,
      encounter: patient.encounters[0] ?? null,
      scenario: patient.scenarios[0] ?? null
    }))
  });
}
