"use client";

import Link from "next/link";
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
} from "lucide-react";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { UserRole } from "@/types";

const NAV_ITEMS: { href: string; label: string; icon: typeof CalendarClock; roles: UserRole[] }[] = [
  { href: "", label: "اليوم", icon: CalendarClock, roles: ["owner", "manager", "doctor", "secretary"] },
  { href: "/appointments", label: "المواعيد", icon: ClipboardList, roles: ["owner", "manager", "secretary"] },
  { href: "/reminders", label: "التذكيرات", icon: BellRing, roles: ["owner", "manager", "secretary"] },
  { href: "/ratings", label: "التقييمات", icon: Star, roles: ["owner", "manager", "doctor"] },
  { href: "/reports", label: "التقارير", icon: BarChart3, roles: ["owner", "manager"] },
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

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  const displayName = platformUser?.name || ROLE_LABEL_AR[role];
  const initial = displayName.trim().charAt(0) || "ع";

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-e border-border bg-card">
      <div className="flex h-16 items-center gap-2.5 border-b border-border px-5">
        <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm shadow-emerald-500/30">
          <MessageCircle className="size-4" />
        </span>
        <div className="leading-tight">
          <p className="text-sm font-extrabold tracking-tight">
            MediSync <span className="text-primary">AI</span>
          </p>
          <p className="text-[11px] text-muted-foreground">{ROLE_LABEL_AR[role]}</p>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {NAV_ITEMS.filter((item) => item.roles.includes(role)).map((item) => {
          const href = `${base}${item.href}`;
          const isActive = item.href === "" ? pathname === base : pathname.startsWith(href);
          return (
            <Link
              key={item.href}
              href={href}
              className={cn(
                "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              {isActive && (
                <span className="absolute inset-y-1 start-0 w-0.5 rounded-full bg-primary" />
              )}
              <item.icon className="size-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-3">
        <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
          <Avatar className="size-9 border border-border">
            <AvatarFallback className="bg-primary/10 text-sm font-bold text-primary">
              {initial}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-semibold">{displayName}</p>
            <p dir="ltr" className="truncate text-end text-[11px] text-muted-foreground">
              {user?.email ?? ""}
            </p>
          </div>
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
  );
}
