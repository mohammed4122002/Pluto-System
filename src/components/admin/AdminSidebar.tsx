"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Stethoscope,
  CreditCard,
  Workflow,
  Settings,
  LogOut,
  MessageCircle,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";
import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ChangePasswordDialog } from "@/components/shared/ChangePasswordDialog";

const NAV_GROUPS = [
  {
    label: "الرئيسية",
    items: [{ href: "/admin", label: "نظرة عامة", icon: LayoutDashboard }],
  },
  {
    label: "الإدارة",
    items: [
      { href: "/admin/clinics", label: "العيادات", icon: Stethoscope },
      { href: "/admin/subscriptions", label: "الاشتراكات", icon: CreditCard },
    ],
  },
  {
    label: "النظام",
    items: [
      { href: "/admin/n8n", label: "مراقبة n8n", icon: Workflow },
      { href: "/admin/settings", label: "الإعدادات", icon: Settings },
    ],
  },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, platformUser } = useUser();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  const displayName = platformUser?.name || "مالك المنصة";
  const initial = displayName.trim().charAt(0) || "م";

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-e border-border/70 bg-card">
      <div className="flex h-16 items-center gap-2.5 border-b border-border/70 px-5">
        <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-brand ring-inset-highlight">
          <MessageCircle className="size-4" />
        </span>
        <div className="leading-tight">
          <p className="text-sm font-extrabold tracking-tight">
            MediSync <span className="text-primary">AI</span>
          </p>
          <p className="text-[11px] text-muted-foreground">لوحة الإدارة</p>
        </div>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto p-3">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="px-3 pb-1.5 text-[11px] font-semibold text-muted-foreground/70">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive =
                  item.href === "/admin"
                    ? pathname === "/admin"
                    : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
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
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
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
  );
}
