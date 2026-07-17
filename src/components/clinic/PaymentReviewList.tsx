"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, Loader2, ExternalLink, Clock } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface PayRow {
  id: string;
  patient_name: string | null;
  patient_phone: string | null;
  appointment_time: string;
  deposit_amount: number | null;
  payment_method: string | null;
  payment_proof_url: string | null;
  payment_status: string;
}

const STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: "بانتظار المراجعة", cls: "bg-warning/15 text-warning" },
  paid: { label: "مدفوع", cls: "bg-success/15 text-success" },
  rejected: { label: "مرفوض", cls: "bg-destructive/15 text-destructive" },
  refunded: { label: "مُسترد", cls: "bg-muted text-muted-foreground" },
  none: { label: "بدون دفع", cls: "bg-muted text-muted-foreground" },
};

function fmt(iso: string) {
  return new Intl.DateTimeFormat("ar-SA", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function PaymentReviewList({
  clinicId,
  initialRows,
}: {
  clinicId: string;
  initialRows: PayRow[];
}) {
  const [rows, setRows] = useState<PayRow[]>(initialRows);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function decide(id: string, status: "paid" | "rejected") {
    setBusyId(id);
    const prev = rows;
    setRows((r) => r.map((x) => (x.id === id ? { ...x, payment_status: status } : x)));
    try {
      const res = await fetch(`/api/clinic/${clinicId}/payments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "فشل الحفظ");
      toast.success(status === "paid" ? "تم تأكيد الدفع ✅" : "تم رفض الدفع");
    } catch (e) {
      setRows(prev);
      toast.error(e instanceof Error ? e.message : "فشل الحفظ");
    } finally {
      setBusyId(null);
    }
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border/70 py-10 text-center text-sm text-muted-foreground">
        <Clock className="size-6 opacity-60" />
        لا توجد مدفوعات للمراجعة حالياً.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((r) => {
        const s = STATUS[r.payment_status] ?? STATUS.none;
        return (
          <div
            key={r.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border px-4 py-3"
          >
            <div className="flex min-w-0 items-center gap-3">
              {r.payment_proof_url ? (
                <a
                  href={r.payment_proof_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0"
                  title="عرض إثبات الدفع بالحجم الكامل"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={r.payment_proof_url}
                    alt="إثبات الدفع"
                    loading="lazy"
                    className="size-14 rounded-md border border-border object-cover"
                  />
                </a>
              ) : null}
              <div className="min-w-0">
                <p className="text-sm font-medium">{r.patient_name || "—"}</p>
              <p className="text-xs text-muted-foreground">
                <span dir="ltr">{fmt(r.appointment_time)}</span>
                {r.deposit_amount ? (
                  <>
                    {" · "}المقدّم <span dir="ltr">{r.deposit_amount}</span>
                  </>
                ) : null}
                {r.payment_method ? ` · ${r.payment_method}` : ""}
              </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {r.payment_proof_url ? (
                <a
                  href={r.payment_proof_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <ExternalLink className="size-3.5" />
                  الإثبات
                </a>
              ) : null}
              <Badge className={s.cls}>{s.label}</Badge>
              {r.payment_status === "pending" ? (
                <>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => decide(r.id, "paid")}
                    disabled={busyId === r.id}
                  >
                    {busyId === r.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="size-4" />
                    )}
                    تأكيد
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="text-destructive"
                    onClick={() => decide(r.id, "rejected")}
                    disabled={busyId === r.id}
                  >
                    <XCircle className="size-4" />
                    رفض
                  </Button>
                </>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
