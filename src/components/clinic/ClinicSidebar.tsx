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
} from "lucide-react";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/useUser";
import type { UserRole } from "@/types";

const NAV_ITEMS: { href: string; label: string; icon: typeof CalendarClock; roles: UserRole[] }[] = [
  { href: "", label: "اليوم", icon: CalendarClock, roles: ["owner", "manager", "doctor", "secretary"] },
  { href: "/appointments", label: "المواعيد", icon: ClipboardList, roles: ["owner", "manager", "secretary"] },
  { href: "/reminders", label: "التذكيرات", icon: BellRing, roles: ["owner", "manager", "secretary"] },
  { href: "/ratings", label: "التقييمات", icon: Star, roles: ["owner", "manager", "doctor"] },
  { href: "/reports", label: "التقارير", icon: BarChart3, roles: ["owner", "manager"] },
  { href: "/settings", label: "الإعدادات", icon: Settings, roles: ["owner", "manager"] },
];

export function ClinicSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams<{ clinicId: string }>();
  const { platformUser } = useUser();

  const base = `/clinic/${params.clinicId}`;
  const role = platformUser?.role ?? "secretary";

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-e border-border bg-card">
      <div className="flex h-14 items-center border-b border-border px-4">
        <span className="text-lg font-bold">MediSync AI</span>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {NAV_ITEMS.filter((item) => item.roles.includes(role)).map((item) => {
          const href = `${base}${item.href}`;
          const isActive = item.href === "" ? pathname === base : pathname.startsWith(href);
          return (
            <Link
              key={item.href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-border p-3">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground"
          onClick={handleLogout}
        >
          <LogOut className="size-4" />
          تسجيل الخروج
        </Button>
      </div>
    </aside>
  );
}
