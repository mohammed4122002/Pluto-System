"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useParams, useRouter } from "next/navigation";
import {
  CalendarClock,
  ClipboardList,
  BellRing,
  Star,
  BarChart3,
  Settings,
  LogOut,
  MessageCircle,
  MessagesSquare,
  Bot,
  Wallet,
  Users,
  Stethoscope,
  UserCog,
  Menu,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ChangePasswordDialog } from "@/components/shared/ChangePasswordDialog";
import type { UserRole } from "@/types";

const NAV_ITEMS: { href: string; label: string; icon: typeof CalendarClock; roles: UserRole[] }[] = [
  { href: "", label: "اليوم", icon: CalendarClock, roles: ["owner", "manager", "doctor", "secretary"] },
  { href: "/conversations", label: "المحادثات", icon: MessagesSquare, roles: ["manager", "doctor", "secretary"] },
  { href: "/appointments", label: "المواعيد", icon: ClipboardList, roles: ["owner", "manager", "secretary"] },
  { href: "/payments", label: "المدفوعات", icon: Wallet, roles: ["manager", "secretary"] },
  { href: "/services", label: "الخدمات", icon: Stethoscope, roles: ["owner", "manager"] },
  { href: "/employees", label: "الموظفون", icon: UserCog, roles: ["owner", "manager"] },
  { href: "/patients", label: "المرضى", icon: Users, roles: ["owner", "manager", "secretary", "doctor"] },
  { href: "/reminders", label: "التذكيرات", icon: BellRing, roles: ["owner", "manager", "secretary"] },
  { href: "/ratings", label: "التقييمات", icon: Star, roles: ["owner", "manager", "doctor"] },
  { href: "/reports", label: "التقارير", icon: BarChart3, roles: ["owner", "manager"] },
  { href: "/bot-status", label: "حالة البوت", icon: Bot, roles: ["manager"] },
  { href: "/settings", label: "الإعدادات", icon: Settings, roles: ["owner", "manager"] },
];

const ROLE_LABEL_AR: Record<UserRole, string> = {
  owner: "مالك المنصة",
  manager: "مدير العيادة",
  doctor: "طبيب",
  secretary: "سكرتيرة",
};

export function ClinicSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams<{ clinicId: string }>();
  const { user, platformUser } = useUser();

  const base = `/clinic/${params.clinicId}`;
  const role = platformUser?.role ?? "secretary";

  // Mobile drawer open/close. Each nav link closes it on tap (below) so a
  // navigation never leaves the overlay covering the page.
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Live count of conversations the AI handed off to a human, so staff see
  // escalations from any page (not only when the inbox is open).
  const [attention, setAttention] = useState(0);
  useEffect(() => {
    // Owner can't read conversations, so don't poll the count for them.
    if (!params.clinicId || role === "owner") return;
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch(
          `/api/clinics/${params.clinicId}/conversations/attention-count`
        );
        if (res.ok && alive) setAttention((await res.json()).count ?? 0);
      } catch {
        /* transient — keep last value */
      }
    };
    load();
    const t = setInterval(load, 15000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [params.clinicId, role]);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  const displayName = platformUser?.name || ROLE_LABEL_AR[role];
  const initial = displayName.trim().charAt(0) || "ع";

  return (
    <>
      {/* شريط علوي للجوال — يظهر فقط دون شاشات lg، ويحوي زر فتح القائمة */}
      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-border/70 bg-card/95 px-4 backdrop-blur lg:hidden">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-brand ring-inset-highlight">
            <MessageCircle className="size-4" />
          </span>
          <p className="text-sm font-extrabold tracking-tight">
            MediSync <span className="text-primary">AI</span>
          </p>
        </div>
        <button
          onClick={() => setOpen(true)}
          aria-label="فتح القائمة"
          className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <Menu className="size-5" />
        </button>
      </header>

      {/* الخلفية المعتمة عند فتح القائمة على الجوال */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          aria-hidden
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 start-0 z-50 flex w-72 max-w-[85%] shrink-0 flex-col border-e border-border/70 bg-card shadow-brand-lg transition-transform duration-300 ease-in-out",
          "lg:static lg:z-auto lg:w-64 lg:max-w-none lg:translate-x-0 lg:shadow-none",
          open ? "translate-x-0" : "translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex h-16 items-center gap-2.5 border-b border-border/70 px-5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-brand ring-inset-highlight">
            <MessageCircle className="size-4" />
          </span>
          <div className="leading-tight">
            <p className="text-sm font-extrabold tracking-tight">
              MediSync <span className="text-primary">AI</span>
            </p>
            <p className="text-[11px] text-muted-foreground">{ROLE_LABEL_AR[role]}</p>
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="إغلاق القائمة"
            className="ms-auto flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground lg:hidden"
          >
            <X className="size-5" />
          </button>
        </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {NAV_ITEMS.filter((item) => item.roles.includes(role)).map((item) => {
          const href = `${base}${item.href}`;
          const isActive = item.href === "" ? pathname === base : pathname.startsWith(href);
          return (
            <Link
              key={item.href}
              href={href}
              onClick={() => setOpen(false)}
              className={cn(
                "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                isActive
                  ? "bg-gradient-to-b from-primary/12 to-primary/5 text-primary shadow-brand-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              {isActive && (
                <span className="absolute inset-y-1.5 start-0 w-[3px] rounded-full bg-gradient-to-b from-emerald-500 to-teal-600" />
              )}
              <item.icon className="size-4 shrink-0" />
              {item.label}
              {item.href === "/conversations" && attention > 0 && (
                <span className="ms-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[11px] font-bold text-destructive-foreground">
                  {attention}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border/70 p-3">
        <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
          <Avatar className="size-9 shadow-brand-sm ring-1 ring-border">
            <AvatarFallback className="bg-gradient-to-br from-primary/90 to-primary text-sm font-bold text-primary-foreground">
              {initial}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-semibold">{displayName}</p>
            <p dir="ltr" className="truncate text-end text-[11px] text-muted-foreground">
              {user?.email ?? ""}
            </p>
          </div>
          <ChangePasswordDialog />
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleLogout}
                className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                aria-label="تسجيل الخروج"
              >
                <LogOut className="size-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">تسجيل الخروج</TooltipContent>
          </Tooltip>
        </div>
      </div>
      </aside>
    </>
  );
}
