import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { PrismaClient } from "@prisma/client";

export type ProblemCatalogEntry = { name: string };

const PROBLEM_CATALOG_CSV_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../apps/ehr/data/problem-list-catalog.csv"
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

function parseProblemCsv(csvText: string): ProblemCatalogEntry[] {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length < 2) {
    throw new Error("Problem catalog CSV must include a header row and at least one data row.");
  }

  const header = parseCsvLine(lines[0]).map((value) => value.toLowerCase());
  const requiredHeaders = ["problem"];

  for (const requiredHeader of requiredHeaders) {
    if (!header.includes(requiredHeader)) {
      throw new Error(`Missing column "${requiredHeader}" in problem catalog CSV`);
    }
  }

  const problemIndex = header.indexOf("problem");
  const deduped = new Set<string>();
  const entries: ProblemCatalogEntry[] = [];

  for (const line of lines.slice(1)) {
    const cells = parseCsvLine(line);
    const name = (cells[problemIndex] ?? "").trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (deduped.has(key)) continue;
    deduped.add(key);
    entries.push({ name });
  }

  if (entries.length === 0) {
    throw new Error("Problem catalog CSV had no valid rows after parsing.");
  }

  return entries;
}

export async function loadProblemCatalogFromCsv(): Promise<ProblemCatalogEntry[]> {
  const csv = await readFile(PROBLEM_CATALOG_CSV_PATH, "utf-8");
  return parseProblemCsv(csv);
}

export async function seedProblemCatalogFromCsv(prisma: PrismaClient): Promise<number> {
  const entries = await loadProblemCatalogFromCsv();

  await prisma.$executeRaw`
    DELETE FROM "Problem"
    WHERE patientId IS NULL
      AND encounterId IS NULL
  `;

  for (const entry of entries) {
    await prisma.$executeRaw`
      INSERT INTO "Problem" (id, name, patientId, encounterId, createdAt)
      VALUES (
        lower(hex(randomblob(16))),
        ${entry.name},
        NULL,
        NULL,
        datetime('now')
      )
    `;
  }

  return entries.length;
}

export async function loadProblemCatalogFromDb(prisma: PrismaClient): Promise<ProblemCatalogEntry[]> {
  const entries = await prisma.$queryRaw<ProblemCatalogEntry[]>`
    SELECT name
    FROM "Problem"
    WHERE patientId IS NULL
      AND encounterId IS NULL
    ORDER BY name ASC
  `;

  if (entries.length === 0) {
    throw new Error("Problem catalog table is empty. Run database seed to import CSV catalog rows.");
  }

  return entries;
}
