// Minimal CSV builder. Prepends a UTF-8 BOM so Arabic renders correctly when
// the file is opened in Excel.
export type CsvColumn<T> = { key: keyof T | string; label: string };

function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function toCsv<T extends Record<string, unknown>>(
  columns: CsvColumn<T>[],
  rows: T[]
): string {
  const header = columns.map((c) => escapeCell(c.label)).join(",");
  const body = rows
    .map((r) => columns.map((c) => escapeCell(r[c.key as string])).join(","))
    .join("\r\n");
  return `﻿${header}\r\n${body}`;
}
