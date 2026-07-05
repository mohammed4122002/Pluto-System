"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Pause, Play, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
import type { ClinicStatus } from "@/types";

export function ClinicActionsMenu({
  clinicId,
  clinicName,
  status,
  redirectOnDelete,
}: {
  clinicId: string;
  clinicName: string;
  status: ClinicStatus;
  /** Path to navigate to after a successful delete (detail page). Omit to just refresh (table row). */
  redirectOnDelete?: string;
}) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function toggleSuspend() {
    setIsPending(true);
    try {
      const res =
        status === "suspended"
          ? await fetch(`/api/clinics/${clinicId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: "active" }),
            })
          : await fetch(`/api/clinics/${clinicId}/suspend`, { method: "POST" });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "فشل تنفيذ العملية");
      }

      toast.success(
        status === "suspended" ? "تم تفعيل العيادة" : "تم إيقاف العيادة مؤقتاً"
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

  async function handleDelete() {
    setIsPending(true);
    try {
      const res = await fetch(`/api/clinics/${clinicId}`, { method: "DELETE" });
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
          <DropdownMenuItem onClick={toggleSuspend} disabled={isPending}>
            {status === "suspended" ? (
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

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>حذف عيادة &quot;{clinicName}&quot;؟</DialogTitle>
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
