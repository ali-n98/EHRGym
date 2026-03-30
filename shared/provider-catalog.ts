import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { PrismaClient } from "@prisma/client";

export type ProviderCatalogEntry = {
  firstName: string;
  lastName: string;
  department: string;
};

const PROVIDER_CATALOG_CSV_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../apps/ehr/data/provider-catalog.csv"
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

function parseProviderCsv(csvText: string): ProviderCatalogEntry[] {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length < 2) {
    throw new Error("Provider catalog CSV must include a header row and at least one data row.");
  }

  const header = parseCsvLine(lines[0]).map((v) => v.toLowerCase());
  const requiredHeaders = ["first_name", "last_name", "department"];

  for (const requiredHeader of requiredHeaders) {
    if (!header.includes(requiredHeader)) {
      throw new Error(`Missing column "${requiredHeader}" in provider catalog CSV`);
    }
  }

  const firstNameIndex = header.indexOf("first_name");
  const lastNameIndex = header.indexOf("last_name");
  const departmentIndex = header.indexOf("department");

  const deduped = new Set<string>();
  const entries: ProviderCatalogEntry[] = [];

  for (const line of lines.slice(1)) {
    const cells = parseCsvLine(line);
    const firstName = (cells[firstNameIndex] ?? "").trim();
    const lastName = (cells[lastNameIndex] ?? "").trim();
    const department = (cells[departmentIndex] ?? "").trim();

    if (!firstName || !lastName || !department) {
      continue;
    }

    const key = `${firstName}\u0000${lastName}\u0000${department}`;
    if (deduped.has(key)) continue;
    deduped.add(key);

    entries.push({ firstName, lastName, department });
  }

  if (entries.length === 0) {
    throw new Error("Provider catalog CSV had no valid rows after parsing.");
  }

  return entries;
}

export async function loadProviderCatalogFromCsv(): Promise<ProviderCatalogEntry[]> {
  const csv = await readFile(PROVIDER_CATALOG_CSV_PATH, "utf-8");
  return parseProviderCsv(csv);
}

export async function seedProviderCatalogFromCsv(prisma: PrismaClient): Promise<number> {
  const entries = await loadProviderCatalogFromCsv();

  await prisma.$executeRaw`
    DELETE FROM "Provider"
  `;

  for (const entry of entries) {
    await prisma.$executeRaw`
      INSERT INTO "Provider" (id, "firstName", "lastName", "department", "createdAt", "updatedAt")
      VALUES (
        lower(hex(randomblob(16))),
        ${entry.firstName},
        ${entry.lastName},
        ${entry.department},
        datetime('now'),
        datetime('now')
      )
    `;
  }

  return entries.length;
}

export async function loadProviderCatalogFromDb(prisma: PrismaClient): Promise<ProviderCatalogEntry[]> {
  const entries = await prisma.$queryRaw<ProviderCatalogEntry[]>`
    SELECT "firstName" AS firstName, "lastName" AS lastName, "department" AS department
    FROM "Provider"
    ORDER BY department ASC, lastName ASC, firstName ASC
  `;

  if (entries.length === 0) {
    throw new Error("Provider table is empty. Run database seed to import CSV rows.");
  }

  return entries;
}
