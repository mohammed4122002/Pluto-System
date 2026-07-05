"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Pause, Play, Trash2, Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Clinic } from "@/types";

type EditableClinic = Pick<
  Clinic,
  "id" | "name" | "doctor_name" | "specialty" | "city" | "address" | "phone" | "status"
>;

export function ClinicActionsMenu({
  clinic,
  redirectOnDelete,
}: {
  clinic: EditableClinic;
  /** Path to navigate to after a successful delete (detail page). Omit to just refresh (table row). */
  redirectOnDelete?: string;
}) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  async function toggleSuspend() {
    setIsPending(true);
    try {
      const res =
        clinic.status === "suspended"
          ? await fetch(`/api/clinics/${clinic.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: "active" }),
            })
          : await fetch(`/api/clinics/${clinic.id}/suspend`, { method: "POST" });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "فشل تنفيذ العملية");
      }

      toast.success(
        clinic.status === "suspended" ? "تم تفعيل العيادة" : "تم إيقاف العيادة مؤقتاً"
      );
      router.refresh();
    } catch (error) {
      toast.error("حدث خطأ", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setIsPending(false);
    }
  }

  async function handleEditSubmit(formData: FormData) {
    setIsPending(true);
    try {
      const res = await fetch(`/api/clinics/${clinic.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: String(formData.get("name") ?? ""),
          doctor_name: String(formData.get("doctor_name") ?? ""),
          specialty: String(formData.get("specialty") ?? "") || null,
          city: String(formData.get("city") ?? "") || null,
          address: String(formData.get("address") ?? "") || null,
          phone: String(formData.get("phone") ?? "") || null,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "فشل حفظ التعديلات");
      }

      toast.success("تم حفظ بيانات العيادة");
      setEditOpen(false);
      router.refresh();
    } catch (error) {
      toast.error("تعذّر حفظ التعديلات", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setIsPending(false);
    }
  }

  async function handleDelete() {
    setIsPending(true);
    try {
      const res = await fetch(`/api/clinics/${clinic.id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "فشل حذف العيادة");
      }

      toast.success("تم حذف العيادة نهائياً");
      setConfirmOpen(false);
      if (redirectOnDelete) {
        router.push(redirectOnDelete);
      }
      router.refresh();
    } catch (error) {
      toast.error("تعذّر حذف العيادة", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setIsPending(false);
    }
  }

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
          <DropdownMenuItem onClick={() => setEditOpen(true)} disabled={isPending}>
            <Pencil className="size-4" />
            تعديل بيانات العيادة
          </DropdownMenuItem>
          <DropdownMenuItem onClick={toggleSuspend} disabled={isPending}>
            {clinic.status === "suspended" ? (
              <>
                <Play className="size-4" />
                تفعيل العيادة
              </>
            ) : (
              <>
                <Pause className="size-4" />
                إيقاف مؤقت
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setConfirmOpen(true)}
            disabled={isPending}
          >
            <Trash2 className="size-4" />
            حذف العيادة
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تعديل بيانات العيادة</DialogTitle>
          </DialogHeader>
          <form action={handleEditSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">اسم العيادة</Label>
              <Input id="name" name="name" defaultValue={clinic.name} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="doctor_name">اسم الطبيب</Label>
              <Input
                id="doctor_name"
                name="doctor_name"
                defaultValue={clinic.doctor_name}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="specialty">التخصص</Label>
              <Input id="specialty" name="specialty" defaultValue={clinic.specialty ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">المدينة</Label>
              <Input id="city" name="city" defaultValue={clinic.city ?? ""} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="address">العنوان</Label>
              <Input id="address" name="address" defaultValue={clinic.address ?? ""} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="phone">الهاتف</Label>
              <Input id="phone" name="phone" dir="ltr" defaultValue={clinic.phone ?? ""} />
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

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>حذف عيادة &quot;{clinic.name}&quot;؟</DialogTitle>
            <DialogDescription>
              هذا الإجراء نهائي ولا يمكن التراجع عنه. سيتم حذف كل بيانات العيادة
              المرتبطة (قنوات التواصل، إعدادات قاعدة البيانات، الأتمتة،
              والاشتراكات) بشكل كامل.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={isPending}
            >
              إلغاء
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
              {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              نعم، احذف نهائياً
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
