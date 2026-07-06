"use client";

import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { toCsv, type CsvColumn } from "@/lib/csv";

// Downloads a client-side CSV (Excel-compatible). No server round-trip — the
// rows are already on the page.
export function ExportButton<T extends Record<string, unknown>>({
  filename,
  columns,
  rows,
  label = "تصدير Excel",
}: {
  filename: string;
  columns: CsvColumn<T>[];
  rows: T[];
  label?: string;
}) {
  function handleExport() {
    const csv = toCsv(columns, rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={rows.length === 0}
      className="gap-2"
    >
      <Download className="size-4" />
      {label}
    </Button>
  );
}
