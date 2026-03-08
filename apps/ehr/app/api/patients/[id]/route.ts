import { NextResponse } from "next/server";

import { parseJsonValue } from "../../../../lib/chart";
import { prisma } from "../../../../lib/db";

type ApiPatient = {
  id: string;
  mrn: string;
  fullName: string;
  age: number;
  sex: string;
  allergiesJson: string;
  bannerFlagsJson: string;
  summary: string;
  encounters: Array<{
    id: string;
    type: string;
    reasonForVisit: string;
    provider: string;
    startedAt: Date;
    status: string;
    labs: Array<{
      id: string;
      name: string;
      loinc: string | null;
      value: string;
      unit: string;
      referenceRange: string;
      abnormal: boolean;
      collectedAt: Date;
    }>;
    notes: Array<{
      id: string;
      type: string;
      title: string;
      author: string;
      content: string;
      signed: boolean;
      createdAt: Date;
    }>;
    orders: Array<{
      id: string;
      name: string;
      category: string;
      parametersJson: string;
      status: string;
      rationale: string;
      createdAt: Date;
    }>;
  }>;
  scenarios: Array<{
    id: string;
    encounterId: string;
    title: string;
    objective: string;
    rubricJson: string;
    requiredOrdersJson: string;
    requiredNoteElementsJson: string;
  }>;
};

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  const patient: ApiPatient | null = await prisma.patient.findUnique({
    where: { id },
    include: {
      encounters: {
        orderBy: { startedAt: "desc" },
        include: {
          labs: { orderBy: { collectedAt: "desc" } },
          notes: { orderBy: { createdAt: "desc" } },
          orders: { orderBy: { createdAt: "desc" } }
        }
      },
      scenarios: {
        orderBy: { createdAt: "desc" }
      }
    }
  });

  if (!patient) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }

  return NextResponse.json({
    patient: {
      id: patient.id,
      mrn: patient.mrn,
      fullName: patient.fullName,
      age: patient.age,
      sex: patient.sex,
      allergies: parseJsonValue<string[]>(patient.allergiesJson),
      bannerFlags: parseJsonValue<string[]>(patient.bannerFlagsJson),
      summary: patient.summary,
      encounters: patient.encounters.map((encounter: ApiPatient["encounters"][number]) => ({
        ...encounter,
        orders: encounter.orders.map((order: ApiPatient["encounters"][number]["orders"][number]) => ({
          ...order,
          parameters: parseJsonValue<Record<string, string>>(order.parametersJson)
        }))
      })),
      scenarios: patient.scenarios.map((scenario: ApiPatient["scenarios"][number]) => ({
        ...scenario,
        rubric: parseJsonValue<string[]>(scenario.rubricJson),
        requiredOrders: parseJsonValue<string[]>(scenario.requiredOrdersJson),
        requiredNoteElements: parseJsonValue<string[]>(scenario.requiredNoteElementsJson)
      }))
    }
  });
}
