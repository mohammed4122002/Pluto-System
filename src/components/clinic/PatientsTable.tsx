"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/EmptyState";
import { ExportButton } from "@/components/shared/ExportButton";
import type { DerivedPatient } from "@/lib/clinic-data";

function dateAr(iso: string | null) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("ar-SA", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Riyadh",
  }).format(new Date(iso));
}

export function PatientsTable({ patients }: { patients: DerivedPatient[] }) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const t = q.trim();
    if (!t) return patients;
    return patients.filter(
      (p) => p.name.includes(t) || p.phone.includes(t)
    );
  }, [q, patients]);

  if (patients.length === 0) {
    return (
      <EmptyState
        title="لا يوجد مرضى بعد"
        description="ستظهر قائمة المرضى تلقائياً من سجل المواعيد."
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute top-1/2 -translate-y-1/2 size-4 text-muted-foreground start-3" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث بالاسم أو رقم الهاتف..."
            className="w-full rounded-lg border border-input bg-background py-2 ps-9 pe-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <ExportButton
          filename="patients"
          rows={filtered as unknown as Record<string, unknown>[]}
          columns={[
            { key: "name", label: "الاسم" },
            { key: "phone", label: "الهاتف" },
            { key: "total", label: "إجمالي الزيارات" },
            { key: "completed", label: "مكتملة" },
            { key: "no_show", label: "تغيّب" },
            { key: "cancelled", label: "ملغاة" },
            { key: "last_visit", label: "آخر زيارة" },
            { key: "next_upcoming", label: "الموعد القادم" },
          ]}
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-border/70">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>المريض</TableHead>
              <TableHead>الهاتف</TableHead>
              <TableHead>الزيارات</TableHead>
              <TableHead>آخر زيارة</TableHead>
              <TableHead>الموعد القادم</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((p) => (
              <TableRow key={p.key}>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell dir="ltr" className="text-start">
                  {p.phone || "—"}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap items-center gap-1">
                    <Badge variant="secondary">{p.total}</Badge>
                    {p.completed > 0 && (
                      <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                        {p.completed} مكتمل
                      </Badge>
                    )}
                    {p.no_show > 0 && (
                      <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400">
                        {p.no_show} تغيّب
                      </Badge>
                    )}
                    {p.cancelled > 0 && (
                      <Badge variant="outline">{p.cancelled} ملغى</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>{dateAr(p.last_visit)}</TableCell>
                <TableCell>
                  {p.next_upcoming ? (
                    <span className="font-medium text-primary">
                      {dateAr(p.next_upcoming)}
                    </span>
                  ) : (
                    "—"
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {filtered.length === 0 && (
        <p className="py-6 text-center text-sm text-muted-foreground">
          لا نتائج مطابقة للبحث.
        </p>
      )}
    </div>
  );
}
