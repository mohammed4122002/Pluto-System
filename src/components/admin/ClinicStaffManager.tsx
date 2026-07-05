"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2, UserRound } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { UserRole } from "@/types";

interface StaffMember {
  id: string;
  name: string | null;
  email: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

const ROLE_LABEL_AR: Record<Exclude<UserRole, "owner">, string> = {
  manager: "مدير العيادة",
  doctor: "طبيب",
  secretary: "سكرتيرة",
};

export function ClinicStaffManager({
  clinicId,
  initialStaff,
}: {
  clinicId: string;
  initialStaff: StaffMember[];
}) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  async function handleAdd(formData: FormData) {
    setIsPending(true);
    try {
      const res = await fetch(`/api/clinics/${clinicId}/staff`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: String(formData.get("name") ?? ""),
          email: String(formData.get("email") ?? ""),
          password: String(formData.get("password") ?? ""),
          role: String(formData.get("role") ?? "manager"),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "فشل إنشاء الحساب");

      toast.success("تم إنشاء حساب الموظف — سلّمه بيانات الدخول");
      setAddOpen(false);
      router.refresh();
    } catch (error) {
      toast.error("تعذّر إنشاء الحساب", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setIsPending(false);
    }
  }

  async function handleDelete(staffId: string) {
    setIsPending(true);
    try {
      const res = await fetch(`/api/clinics/${clinicId}/staff/${staffId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "فشل حذف الحساب");

      toast.success("تم حذف حساب الموظف");
      router.refresh();
    } catch (error) {
      toast.error("تعذّر حذف الحساب", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setIsPending(false);
    }
  }

  return (
    <>
      <div className="space-y-3">
        {initialStaff.length === 0 ? (
          <p className="text-sm text-muted-foreground">لا يوجد موظفون مسجّلون لهذه العيادة.</p>
        ) : (
          initialStaff.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
            >
              <div className="flex items-center gap-2 text-sm">
                <UserRound className="size-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">{member.name || "—"}</p>
                  <p className="text-xs text-muted-foreground" dir="ltr">
                    {member.email}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {ROLE_LABEL_AR[member.role as Exclude<UserRole, "owner">] ?? member.role}
                </Badge>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 text-destructive"
                  disabled={isPending}
                  onClick={() => handleDelete(member.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))
        )}

        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => setAddOpen(true)}
        >
          <Plus className="size-4" />
          إضافة موظف
        </Button>
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إضافة موظف جديد</DialogTitle>
          </DialogHeader>
          <form action={handleAdd} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">الاسم</Label>
              <Input id="name" name="name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <Input id="email" name="email" type="email" dir="ltr" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">كلمة المرور</Label>
              <Input id="password" name="password" type="text" dir="ltr" required minLength={6} />
              <p className="text-xs text-muted-foreground">
                سلّم هذه البيانات للموظف مباشرة — لا يوجد بريد دعوة تلقائي حالياً.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">الدور</Label>
              <select
                id="role"
                name="role"
                defaultValue="manager"
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="manager">مدير العيادة</option>
                <option value="doctor">طبيب</option>
                <option value="secretary">سكرتيرة</option>
              </select>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddOpen(false)}
                disabled={isPending}
              >
                إلغاء
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                إنشاء الحساب
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
