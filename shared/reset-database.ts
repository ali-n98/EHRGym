import type { PrismaClient } from "@prisma/client";

import { seedPatients } from "./seed-data";
import { seedOrderCatalogFromCsv } from "./order-catalog.js";
import { seedProblemCatalogFromCsv } from "./problem-list-catalog.js";
import { seedDiagnosisCatalogFromCsv } from "./diagnosis-catalog.js";
import { seedProviderCatalogFromCsv } from "./provider-catalog.js";

export async function resetDatabase(prisma: PrismaClient) {
  await prisma.referral.deleteMany();
  await prisma.provider.deleteMany();
  await prisma.order.deleteMany();
  await prisma.clinicalNote.deleteMany();
  await prisma.labResult.deleteMany();
  await prisma.scenario.deleteMany();
  await prisma.encounter.deleteMany();
  await prisma.patient.deleteMany();

  for (const patient of seedPatients) {
    await prisma.patient.create({
      data: {
        id: patient.id,
        mrn: patient.mrn,
        fullName: patient.fullName,
        age: patient.age,
        sex: patient.sex,
        allergiesJson: JSON.stringify(patient.allergies),
        bannerFlagsJson: JSON.stringify(patient.bannerFlags),
        summary: patient.summary,
        encounters: {
          create: patient.encounters.map((encounter) => ({
            id: encounter.id,
            type: encounter.type,
            reasonForVisit: encounter.reasonForVisit,
            provider: encounter.provider,
            startedAt: new Date(encounter.startedAt),
            status: encounter.status,
            labs: {
              create: encounter.labs.map((lab) => ({
                id: lab.id,
                name: lab.name,
                loinc: lab.loinc,
                value: lab.value,
                unit: lab.unit,
                referenceRange: lab.referenceRange,
                abnormal: lab.abnormal,
                collectedAt: new Date(lab.collectedAt)
              }))
            },
            notes: {
              create: encounter.notes.map((note) => ({
                id: note.id,
                type: note.type,
                title: note.title,
                author: note.author,
                content: note.content,
                signed: note.signed,
                createdAt: new Date(note.createdAt)
              }))
            },
            orders: {
              create: encounter.orders.map((order) => ({
                id: order.id,
                name: order.name,
                category: order.category as unknown as never,
                parametersJson: JSON.stringify(order.parameters),
                status: order.status,
                rationale: order.rationale,
                createdAt: new Date(order.createdAt)
              }))
            }
          }))
        },
        scenarios: {
          create: patient.scenarios.map((scenario, index) => ({
            id: scenario.id,
            title: scenario.title,
            objective: scenario.objective,
            rubricJson: JSON.stringify(scenario.rubric),
            requiredOrdersJson: JSON.stringify(scenario.requiredOrders),
            requiredNoteElementsJson: JSON.stringify(scenario.requiredNoteElements),
            encounterId: patient.encounters[index]?.id ?? patient.encounters[0]?.id
          }))
        }
      }
    });
  }

  const orderCatalogCount = await seedOrderCatalogFromCsv(prisma);
  const providerCatalogCount = await seedProviderCatalogFromCsv(prisma);

  const problemCatalogCount = await seedProblemCatalogFromCsv(prisma);
  const diagnosisCatalogCount = await seedDiagnosisCatalogFromCsv(prisma);

  return {
    patientCount: seedPatients.length,
    orderCatalogCount,
    problemCatalogCount,
    diagnosisCatalogCount,
    providerCatalogCount
  };
}
