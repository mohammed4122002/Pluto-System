"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

const LINKS = [
  { href: "#features", label: "المميزات" },
  { href: "#how", label: "كيف تعمل" },
  { href: "#pricing", label: "الأسعار" },
  { href: "/clinics", label: "دليل العيادات" },
];

// Mobile-only collapsible menu for the landing navbar. The desktop nav
// (hidden below md) stays as-is; this fills the gap on phones where those
// anchor links were previously unreachable.
export function LandingMobileNav() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "إغلاق القائمة" : "فتح القائمة"}
        aria-expanded={open}
        className="flex size-9 items-center justify-center rounded-lg border border-border/60 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        {open ? <X className="size-5" /> : <Menu className="size-5" />}
      </button>

      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            className="fixed inset-0 top-16 z-30 bg-black/20 backdrop-blur-sm"
            aria-hidden
          />
          <div className="absolute inset-x-0 top-16 z-40 border-b border-border/60 bg-background/95 p-4 shadow-brand-lg backdrop-blur-xl">
            <nav className="mx-auto flex max-w-6xl flex-col gap-1">
              {LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="rounded-xl px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-accent"
                >
                  {link.label}
                </Link>
              ))}
              <div className="mt-2 grid grid-cols-2 gap-2 border-t border-border/60 pt-3">
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="rounded-xl border border-border px-4 py-2.5 text-center text-sm font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  دخول العيادات
                </Link>
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="rounded-xl bg-primary px-4 py-2.5 text-center text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                >
                  ابدأ الآن
                </Link>
              </div>
            </nav>
          </div>
        </>
      )}
    </div>
  );
}
