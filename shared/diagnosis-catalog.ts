import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { PrismaClient } from "@prisma/client";

export type DiagnosisCatalogEntry = {
  code: string;
  category: string;
  name: string;
};

const DIAGNOSIS_CATALOG_CSV_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../apps/ehr/data/diagnosis-catalog.csv"
);

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
}

function parseDiagnosisCsv(csvText: string): DiagnosisCatalogEntry[] {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length < 2) {
    throw new Error("Diagnosis catalog CSV must include a header row and at least one data row.");
  }

  const header = parseCsvLine(lines[0]).map((value) => value.toLowerCase());

  let codeIndex = header.indexOf("icd-10");
  if (codeIndex === -1) codeIndex = header.indexOf("code");
  if (codeIndex === -1) codeIndex = header.indexOf("icd10");

  const categoryIndex = header.indexOf("category");
  const diagnosisIndex = header.indexOf("diagnosis");

  if (codeIndex === -1 || categoryIndex === -1 || diagnosisIndex === -1) {
    throw new Error('Diagnosis CSV must include "ICD-10" (or "code"), "category", and "diagnosis" columns');
  }

  const deduped = new Set<string>();
  const entries: DiagnosisCatalogEntry[] = [];

  for (const line of lines.slice(1)) {
    const cells = parseCsvLine(line);
    const code = (cells[codeIndex] ?? "").trim();
    const category = (cells[categoryIndex] ?? "").trim();
    const name = (cells[diagnosisIndex] ?? "").trim();

    if (!code || !category || !name) continue;

    const dedupeKey = `${code}\u0000${category}\u0000${name}`;
    if (deduped.has(dedupeKey)) continue;
    deduped.add(dedupeKey);

    entries.push({ code, category, name });
  }

  if (entries.length === 0) {
    throw new Error("Diagnosis catalog CSV had no valid rows after parsing.");
  }

  return entries;
}

export async function loadDiagnosisCatalogFromCsv(): Promise<DiagnosisCatalogEntry[]> {
  const csv = await readFile(DIAGNOSIS_CATALOG_CSV_PATH, "utf-8");
  return parseDiagnosisCsv(csv);
}

export async function seedDiagnosisCatalogFromCsv(prisma: PrismaClient): Promise<number> {
  const entries = await loadDiagnosisCatalogFromCsv();

  await prisma.$executeRaw`
    DELETE FROM "Diagnosis"
    WHERE patientId IS NULL
      AND encounterId IS NULL
  `;

  for (const entry of entries) {
    await prisma.$executeRaw`
      INSERT INTO "Diagnosis" (id, code, category, name, patientId, encounterId, createdAt)
      VALUES (
        lower(hex(randomblob(16))),
        ${entry.code},
        ${entry.category},
        ${entry.name},
        NULL,
        NULL,
        datetime('now')
      )
    `;
  }

  return entries.length;
}

export async function loadDiagnosisCatalogFromDb(prisma: PrismaClient): Promise<DiagnosisCatalogEntry[]> {
  const entries = await prisma.$queryRaw<DiagnosisCatalogEntry[]>`
    SELECT code AS code, category AS category, name AS name
    FROM "Diagnosis"
    WHERE patientId IS NULL
      AND encounterId IS NULL
    ORDER BY category ASC, name ASC, code ASC
  `;

  if (entries.length === 0) {
    throw new Error("Diagnosis catalog table is empty. Run database seed to import CSV catalog rows.");
  }

  return entries;
}
