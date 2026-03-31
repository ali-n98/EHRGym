import { notFound } from "next/navigation";

import { PatientWorkspace, type PatientWorkspaceData } from "../../../components/patient-workspace";
import { parseJsonValue } from "../../../lib/chart";
import { prisma } from "../../../lib/db";
import { loadDiagnosisCatalogFromDb } from "../../../../../shared/diagnosis-catalog";
import { loadOrderCatalogFromDb } from "../../../../../shared/order-catalog";
import { loadProblemCatalogFromDb } from "../../../../../shared/problem-list-catalog";
import { loadProviderCatalogFromDb } from "../../../../../shared/provider-catalog";

type PatientPageData = {
  id: string;
  mrn: string;
  fullName: string;
  age: number;
  sex: string;
  allergiesJson: string;
  problemList: Array<{
    name: string;
  }>;
  diagnoses: Array<{
    id: string;
    code: string;
    category: string;
    name: string;
    createdAt: Date;
  }>;
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
      parametersJson: string | null;
      status: string;
      rationale: string | null;
      createdAt: Date;
    }>;
    referrals: Array<{
      id: string;
      referredDepartment: string;
      referredFirstName: string;
      referredLastName: string;
      reason: string | null;
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

type PatientPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function PatientPage({ params }: PatientPageProps) {
  const { id } = await params;
  const [orderCatalog, providerCatalog, problemCatalog, diagnosisCatalog] = await Promise.all([
    loadOrderCatalogFromDb(prisma),
    loadProviderCatalogFromDb(prisma),
    loadProblemCatalogFromDb(prisma),
    loadDiagnosisCatalogFromDb(prisma)
  ]);

  const patient = await prisma.patient.findUnique({
    where: { id },
    include: {
      problemList: {
        select: { name: true }
      },
      diagnoses: {
        select: {
          id: true,
          code: true,
          category: true,
          name: true,
          createdAt: true
        },
        orderBy: [{ category: "asc" }, { name: "asc" }, { code: "asc" }]
      },
      encounters: {
        orderBy: { startedAt: "desc" },
        include: {
          labs: {
            orderBy: { collectedAt: "desc" }
          },
          notes: {
            orderBy: { createdAt: "desc" }
          },
          orders: {
            orderBy: { createdAt: "desc" }
          },
          referrals: {
            orderBy: { createdAt: "desc" }
          }
        }
      },
      scenarios: {
        orderBy: { createdAt: "desc" }
      }
    }
  });

  if (!patient) {
    notFound();
  }

  const activeEncounter = patient.encounters[0];

  if (!activeEncounter) {
    notFound();
  }

  const initialPatient: PatientWorkspaceData = {
    id: patient.id,
    mrn: patient.mrn,
    fullName: patient.fullName,
    age: patient.age,
    sex: patient.sex,
    allergies: parseJsonValue<string[]>(patient.allergiesJson),
    problemList: patient.problemList.map((problem) => problem.name),
    diagnoses: patient.diagnoses.map((diagnosis) => ({
      id: diagnosis.id,
      code: diagnosis.code,
      category: diagnosis.category,
      name: diagnosis.name,
      createdAt: diagnosis.createdAt.toISOString()
    })),
    summary: patient.summary,
    encounters: patient.encounters.map((encounter) => ({
      id: encounter.id,
      type: encounter.type,
      reasonForVisit: encounter.reasonForVisit,
      provider: encounter.provider,
      startedAt: encounter.startedAt.toISOString(),
      status: encounter.status,
      labs: encounter.labs.map((lab) => ({
        ...lab,
        collectedAt: lab.collectedAt.toISOString()
      })),
      notes: encounter.notes.map((note) => ({
        ...note,
        createdAt: note.createdAt.toISOString()
      })),
      orders: encounter.orders
        .filter((order) => order.encounterId !== null)
        .map((order) => ({
          id: order.id,
          name: order.name,
          category: order.category,
          parameters: parseJsonValue<Record<string, string>>(order.parametersJson ?? '{"freeText":""}'),
          status: order.status,
          rationale: order.rationale ?? "",
          createdAt: order.createdAt.toISOString()
        })),
      referrals: encounter.referrals.map((referral) => ({
        id: referral.id,
        referredDepartment: referral.referredDepartment,
        referredProvider:
          referral.referredFirstName.trim() && referral.referredLastName.trim()
            ? `${referral.referredFirstName} ${referral.referredLastName}`
            : "N/A (department only)",
        reason: referral.reason ?? "",
        createdAt: referral.createdAt.toISOString()
        }))
    })),
    scenarios: patient.scenarios.map((item) => ({
      id: item.id,
      encounterId: item.encounterId,
      title: item.title,
      objective: item.objective,
      rubric: parseJsonValue<string[]>(item.rubricJson),
      requiredOrders: parseJsonValue<string[]>(item.requiredOrdersJson),
      requiredNoteElements: parseJsonValue<string[]>(item.requiredNoteElementsJson)
    }))
  };

  return (
    <PatientWorkspace
      initialPatient={initialPatient}
      orderCatalog={orderCatalog}
      providerCatalog={providerCatalog}
      problemCatalog={problemCatalog}
      diagnosisCatalog={diagnosisCatalog}
    />
  );
}
