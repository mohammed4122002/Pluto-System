"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  Loader2,
  MoreHorizontal,
  Pencil,
  RotateCcw,
  UserX,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  updateAppointmentDetails,
  updateAppointmentStatus,
} from "@/app/clinic/[clinicId]/appointments/actions";
import type { Appointment, AppointmentStatus } from "@/types";

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function toDateInputValue(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function toTimeInputValue(d: Date) {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function AppointmentActionsMenu({
  clinicId,
  appointment,
}: {
  clinicId: string;
  appointment: Appointment;
}) {
  const [isPending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);

  function setStatus(status: AppointmentStatus) {
    startTransition(async () => {
      const res = await updateAppointmentStatus(clinicId, appointment.id, status);
      if (res.ok) toast.success("تم تحديث حالة الموعد");
      else toast.error(res.error);
    });
  }

  function handleEditSubmit(formData: FormData) {
    startTransition(async () => {
      const res = await updateAppointmentDetails(clinicId, appointment.id, formData);
      if (res.ok) {
        toast.success("تم حفظ التعديلات");
        setEditOpen(false);
      } else {
        toast.error(res.error);
      }
    });
  }

  const apptDate = new Date(appointment.appointment_time);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8" disabled={isPending}>
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <MoreHorizontal className="size-4" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Pencil className="size-4" />
            تعديل الموعد
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {appointment.status !== "completed" && (
            <DropdownMenuItem onClick={() => setStatus("completed")}>
              <CheckCircle2 className="size-4" />
              تحديد كمكتمل
            </DropdownMenuItem>
          )}
          {appointment.status !== "no_show" && (
            <DropdownMenuItem onClick={() => setStatus("no_show")}>
              <UserX className="size-4" />
              لم يحضر المريض
            </DropdownMenuItem>
          )}
          {appointment.status !== "scheduled" && (
            <DropdownMenuItem onClick={() => setStatus("scheduled")}>
              <RotateCcw className="size-4" />
              إعادة إلى مجدول
            </DropdownMenuItem>
          )}
          {appointment.status !== "cancelled" && (
            <DropdownMenuItem variant="destructive" onClick={() => setStatus("cancelled")}>
              <XCircle className="size-4" />
              إلغاء الموعد
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تعديل الموعد</DialogTitle>
          </DialogHeader>
          <form action={handleEditSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="patient_name">اسم المريض</Label>
              <Input
                id="patient_name"
                name="patient_name"
                defaultValue={appointment.patient_name ?? ""}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="patient_phone">هاتف المريض (واتساب)</Label>
              <Input
                id="patient_phone"
                name="patient_phone"
                dir="ltr"
                defaultValue={appointment.patient_phone ?? ""}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">التاريخ</Label>
              <Input
                id="date"
                name="date"
                type="date"
                defaultValue={toDateInputValue(apptDate)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">الوقت</Label>
              <Input
                id="time"
                name="time"
                type="time"
                defaultValue={toTimeInputValue(apptDate)}
                required
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="notes">ملاحظات</Label>
              <Input id="notes" name="notes" defaultValue={appointment.notes ?? ""} />
            </div>
            <DialogFooter className="sm:col-span-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditOpen(false)}
                disabled={isPending}
              >
                إلغاء
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                حفظ التعديلات
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
