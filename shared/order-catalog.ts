import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { PrismaClient } from "@prisma/client";

export type OrderCatalogEntry = {
  orderName: string;
  cat1: string;
  cat2: string;
  cat3: string;
};

const ORDER_CATALOG_CSV_PATH = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../apps/ehr/data/order-catalog.csv");

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

function parseCatalogCsv(csvText: string): OrderCatalogEntry[] {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length < 2) {
    throw new Error("Order catalog CSV must include a header row and at least one data row.");
  }

  const header = parseCsvLine(lines[0]).map((value) => value.toLowerCase());
  const requiredHeaders = ["order_name", "cat1", "cat2", "cat3"];

  for (const requiredHeader of requiredHeaders) {
    if (!header.includes(requiredHeader)) {
      throw new Error(`Missing column \"${requiredHeader}\" in order catalog CSV`);
    }
  }

  const orderNameIndex = header.indexOf("order_name");
  const cat1Index = header.indexOf("cat1");
  const cat2Index = header.indexOf("cat2");
  const cat3Index = header.indexOf("cat3");

  const dedupedEntries = new Set<string>();
  const entries: OrderCatalogEntry[] = [];

  for (const line of lines.slice(1)) {
    const cells = parseCsvLine(line);
    const orderName = (cells[orderNameIndex] ?? "").trim();
    const cat1 = (cells[cat1Index] ?? "").trim();
    const cat2 = (cells[cat2Index] ?? "").trim();
    const cat3 = (cells[cat3Index] ?? "").trim();

    if (!orderName || !cat1 || !cat2 || !cat3) {
      continue;
    }

    const dedupeKey = `${orderName}\u0000${cat1}\u0000${cat2}\u0000${cat3}`;
    if (dedupedEntries.has(dedupeKey)) {
      continue;
    }

    dedupedEntries.add(dedupeKey);
    entries.push({ orderName, cat1, cat2, cat3 });
  }

  if (entries.length === 0) {
    throw new Error("Order catalog CSV had no valid rows after parsing.");
  }

  return entries;
}

export async function loadOrderCatalogFromCsv(): Promise<OrderCatalogEntry[]> {
  const csv = await readFile(ORDER_CATALOG_CSV_PATH, "utf-8");
  return parseCatalogCsv(csv);
}

export async function seedOrderCatalogFromCsv(prisma: PrismaClient): Promise<number> {
  const entries = await loadOrderCatalogFromCsv();

  await prisma.$executeRaw`
    DELETE FROM "Order"
    WHERE isCatalogEntry = TRUE
  `;

  for (const entry of entries) {
    await prisma.$executeRaw`
      INSERT INTO "Order" (id, name, category, cat2, cat3, parametersJson, status, rationale, isCatalogEntry, createdAt)
      VALUES (
        lower(hex(randomblob(16))),
        ${entry.orderName},
        ${entry.cat1},
        ${entry.cat2},
        ${entry.cat3},
        '{"freeText":"catalog"}',
        'DRAFT',
        'Catalog entry',
        TRUE,
        datetime('now')
      )
    `;
  }

  return entries.length;
}

export async function loadOrderCatalogFromDb(prisma: PrismaClient): Promise<OrderCatalogEntry[]> {
  const entries = await prisma.$queryRaw<OrderCatalogEntry[]>`
    SELECT name AS orderName, category AS cat1, cat2, cat3
    FROM "Order"
    WHERE isCatalogEntry = TRUE
      AND cat2 IS NOT NULL
      AND cat3 IS NOT NULL
    ORDER BY category ASC, cat2 ASC, cat3 ASC, name ASC
  `;

  if (entries.length === 0) {
    throw new Error("Order catalog table is empty. Run database seed to import CSV catalog rows.");
  }

  return entries;
}
