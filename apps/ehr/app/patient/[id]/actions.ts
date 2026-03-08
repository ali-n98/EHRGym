"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";

import { prisma } from "../../../lib/db";

type OrderCategoryValue = "LAB" | "MED" | "IMAGING";
type OrderStatusValue = "DRAFT" | "PENDING_SIGNATURE" | "SIGNED";

function getRequiredField(formData: FormData, key: string) {
  const value = formData.get(key);
  if (!value || typeof value !== "string") {
    throw new Error(`Missing field: ${key}`);
  }

  return value.trim();
}

export async function createProgressNoteAction(formData: FormData) {
  const patientId = getRequiredField(formData, "patientId");
  const encounterId = getRequiredField(formData, "encounterId");
  const author = getRequiredField(formData, "author");
  const title = getRequiredField(formData, "title");
  const content = getRequiredField(formData, "content");

  await prisma.clinicalNote.create({
    data: {
      id: randomUUID(),
      encounterId,
      type: "PROGRESS",
      title,
      author,
      content,
      signed: false
    }
  });

  revalidatePath(`/patient/${patientId}`);
}

export async function createOrderAction(formData: FormData) {
  const patientId = getRequiredField(formData, "patientId");
  const encounterId = getRequiredField(formData, "encounterId");
  const name = getRequiredField(formData, "name");
  const category = getRequiredField(formData, "category") as OrderCategoryValue;
  const parameters = getRequiredField(formData, "parameters");
  const rationale = getRequiredField(formData, "rationale");
  const submitForSignature = formData.get("submitForSignature") === "on";
  const status: OrderStatusValue = submitForSignature ? "PENDING_SIGNATURE" : "DRAFT";

  await prisma.order.create({
    data: {
      id: randomUUID(),
      encounterId,
      name,
      category,
      parametersJson: JSON.stringify({ freeText: parameters }),
      rationale,
      status
    }
  });

  revalidatePath(`/patient/${patientId}`);
}

export async function signOrderAction(formData: FormData) {
  const patientId = getRequiredField(formData, "patientId");
  const orderId = getRequiredField(formData, "orderId");

  await prisma.order.update({
    where: { id: orderId },
    data: { status: "SIGNED" }
  });

  revalidatePath(`/patient/${patientId}`);
}

export async function signEncounterAction(formData: FormData) {
  const patientId = getRequiredField(formData, "patientId");
  const encounterId = getRequiredField(formData, "encounterId");

  await prisma.encounter.update({
    where: { id: encounterId },
    data: { status: "SIGNED" }
  });

  await prisma.clinicalNote.updateMany({
    where: { encounterId },
    data: { signed: true }
  });

  await prisma.order.updateMany({
    where: {
      encounterId,
      status: {
        in: ["DRAFT", "PENDING_SIGNATURE"]
      }
    },
    data: { status: "SIGNED" }
  });

  revalidatePath(`/patient/${patientId}`);
}
