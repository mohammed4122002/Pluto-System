"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarOff,
  Clock,
  Plus,
  Stethoscope,
  Trash2,
  Users,
  CalendarClock,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  updateEmployeeSchedule,
  addEmployeeAbsence,
  removeEmployeeAbsence,
} from "@/app/clinic/[clinicId]/employees/actions";
import type { EmployeeAbsence } from "@/types";

export interface EmployeeView {
  id: string;
  name: string;
  email: string;
  role: string;
  title: string | null;
  phone: string | null;
  work_start: string | null;
  work_end: string | null;
  working_days: number[];
  services: string[];
  absences: EmployeeAbsence[];
  patient_count: number;
  upcoming_count: number;
}

const ROLE_AR: Record<string, string> = {
  manager: "مدير العيادة",
  doctor: "طبيب",
  secretary: "سكرتيرة",
};

const DAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

function fmtTime(t: string | null) {
  if (!t) return "";
  return t.slice(0, 5);
}

function fmtDate(d: string) {
  try {
    return new Intl.DateTimeFormat("ar-SA", {
      day: "numeric",
      month: "short",
    }).format(new Date(d));
  } catch {
    return d;
  }
}

export function EmployeesManager({
  clinicId,
  employees,
}: {
  clinicId: string;
  employees: EmployeeView[];
}) {
  const router = useRouter();
  const [scheduleFor, setScheduleFor] = useState<EmployeeView | null>(null);
  const [absenceFor, setAbsenceFor] = useState<EmployeeView | null>(null);

  if (employees.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          لا يوجد موظفون بعد. أضِفهم من صفحة الإعدادات ← الموظفون.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {employees.map((e) => (
        <Card key={e.id}>
          <CardContent className="space-y-4 p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold">{e.name}</p>
                {e.email ? (
                  <p className="text-xs text-muted-foreground" dir="ltr">
                    {e.email}
                  </p>
                ) : null}
                {e.phone ? (
                  <p className="text-xs text-muted-foreground" dir="ltr">
                    {e.phone}
                  </p>
                ) : null}
              </div>
              <Badge variant="secondary">{e.title || ROLE_AR[e.role] || e.role}</Badge>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-border/60 bg-muted/30 p-2.5">
                <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Users className="size-3.5" /> مرضاه
                </p>
                <p className="text-lg font-bold" dir="ltr">
                  {e.patient_count}
                </p>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/30 p-2.5">
                <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <CalendarClock className="size-3.5" /> مواعيد قادمة
                </p>
                <p className="text-lg font-bold" dir="ltr">
                  {e.upcoming_count}
                </p>
              </div>
            </div>

            {/* Schedule */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Clock className="size-3.5" /> الدوام
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setScheduleFor(e)}
                >
                  تعديل الدوام
                </Button>
              </div>
              {e.work_start && e.work_end ? (
                <p className="text-sm">
                  <span dir="ltr">
                    {fmtTime(e.work_start)} – {fmtTime(e.work_end)}
                  </span>
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">لم يُحدَّد الدوام</p>
              )}
              <div className="flex flex-wrap gap-1">
                {e.working_days.length ? (
                  e.working_days
                    .slice()
                    .sort((a, b) => a - b)
                    .map((d) => (
                      <Badge key={d} variant="outline" className="text-[10px]">
                        {DAYS[d]}
                      </Badge>
                    ))
                ) : (
                  <span className="text-xs text-muted-foreground">لم تُحدَّد أيام العمل</span>
                )}
              </div>
            </div>

            {/* Services */}
            <div className="space-y-1.5">
              <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Stethoscope className="size-3.5" /> الخدمات
              </p>
              {e.services.length ? (
                <div className="flex flex-wrap gap-1">
                  {e.services.map((s) => (
                    <Badge key={s} className="bg-primary/10 text-primary text-[10px]">
                      {s}
                    </Badge>
                  ))}
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">لم يُسنَد لأي خدمة</span>
              )}
            </div>

            {/* Absences */}
            <div className="space-y-1.5 border-t border-border/60 pt-3">
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <CalendarOff className="size-3.5" /> الغياب
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setAbsenceFor(e)}
                >
                  <Plus className="size-3.5" /> تسجيل غياب
                </Button>
              </div>
              {e.absences.length ? (
                <div className="space-y-1">
                  {e.absences.map((a) => (
                    <AbsenceRow key={a.id} clinicId={clinicId} absence={a} />
                  ))}
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">لا غياب مسجّل</span>
              )}
            </div>
          </CardContent>
        </Card>
      ))}

      {scheduleFor && (
        <ScheduleDialog
          clinicId={clinicId}
          employee={scheduleFor}
          onClose={() => setScheduleFor(null)}
          onSaved={() => {
            setScheduleFor(null);
            router.refresh();
          }}
        />
      )}
      {absenceFor && (
        <AbsenceDialog
          clinicId={clinicId}
          employee={absenceFor}
          onClose={() => setAbsenceFor(null)}
          onSaved={() => {
            setAbsenceFor(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function AbsenceRow({
  clinicId,
  absence,
}: {
  clinicId: string;
  absence: EmployeeAbsence;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border border-border/60 px-2.5 py-1.5 text-xs">
      <span className="flex items-center gap-2">
        <span className="font-medium">{fmtDate(absence.absence_date)}</span>
        {absence.reason ? (
          <span className="text-muted-foreground">— {absence.reason}</span>
        ) : null}
      </span>
      <button
        type="button"
        disabled={isPending}
        className="text-destructive/70 transition-colors hover:text-destructive"
        aria-label="حذف الغياب"
        onClick={() =>
          startTransition(async () => {
            const res = await removeEmployeeAbsence(clinicId, absence.id);
            if (res.ok) router.refresh();
            else toast.error(res.error);
          })
        }
      >
        <Trash2 className="size-3.5" />
      </button>
    </div>
  );
}

function ScheduleDialog({
  clinicId,
  employee,
  onClose,
  onSaved,
}: {
  clinicId: string;
  employee: EmployeeView;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [days, setDays] = useState<number[]>(employee.working_days ?? []);
  const [start, setStart] = useState(fmtTime(employee.work_start));
  const [end, setEnd] = useState(fmtTime(employee.work_end));
  const [isPending, startTransition] = useTransition();

  function toggleDay(d: number) {
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  }

  function save() {
    startTransition(async () => {
      const res = await updateEmployeeSchedule(clinicId, employee.id, {
        work_start: start || null,
        work_end: end || null,
        working_days: days.slice().sort((a, b) => a - b),
      });
      if (res.ok) {
        toast.success("تم حفظ الدوام");
        onSaved();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>دوام {employee.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>أيام العمل</Label>
            <div className="flex flex-wrap gap-2">
              {DAYS.map((label, d) => {
                const selected = days.includes(d);
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleDay(d)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                      selected
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:bg-accent"
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>بداية الدوام</Label>
              <Input type="time" dir="ltr" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>نهاية الدوام</Label>
              <Input type="time" dir="ltr" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            إلغاء
          </Button>
          <Button type="button" onClick={save} disabled={isPending}>
            {isPending ? "جارٍ الحفظ..." : "حفظ"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AbsenceDialog({
  clinicId,
  employee,
  onClose,
  onSaved,
}: {
  clinicId: string;
  employee: EmployeeView;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const res = await addEmployeeAbsence(clinicId, {
        employee_user_id: employee.id,
        absence_date: date,
        reason,
      });
      if (res.ok) {
        toast.success("تم تسجيل الغياب");
        onSaved();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>تسجيل غياب — {employee.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>التاريخ</Label>
            <Input type="date" dir="ltr" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>السبب (اختياري)</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="إجازة، مرض..." />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            إلغاء
          </Button>
          <Button type="button" onClick={save} disabled={isPending || !date}>
            {isPending ? "جارٍ الحفظ..." : "حفظ"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
