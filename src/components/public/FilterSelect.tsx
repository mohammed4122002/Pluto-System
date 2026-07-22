"use client";

import { useEffect, useRef, useState, type ComponentType } from "react";
import { Check, ChevronDown, MapPin } from "lucide-react";

export type FilterOption = { value: string; label: string };

/**
 * A site-styled dropdown that replaces the native <select> so the city/country
 * filter matches the rest of the UI (rounded, RTL-aware, themed) instead of
 * falling back to the OS picker. Closes on outside-click and Escape.
 */
export function FilterSelect({
  value,
  onChange,
  options,
  placeholder,
  icon: Icon = MapPin,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  options: FilterOption[];
  placeholder: string;
  icon?: ComponentType<{ className?: string }>;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const selected = options.find((o) => o.value === value) ?? null;

  return (
    <div ref={ref} className="relative group">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        className="flex w-full items-center rounded-2xl border border-border/50 bg-background/50 py-3.5 ps-13 pe-12 text-sm text-start outline-none transition-all hover:border-border/70 hover:bg-background focus-visible:border-primary/60 focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-primary/15 shadow-sm hover:shadow-md"
      >
        <Icon className="pointer-events-none absolute top-1/2 -translate-y-1/2 size-5 text-primary/50 start-4 transition-colors group-hover:text-primary" />
        <span className={`truncate ${selected ? "text-foreground" : "text-muted-foreground/70"}`}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          className={`pointer-events-none absolute top-1/2 -translate-y-1/2 end-4 size-5 text-primary/50 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border border-border/60 bg-card/95 shadow-brand-lg ring-1 ring-black/5 backdrop-blur-xl animate-in fade-in-0 slide-in-from-top-2 duration-150 dark:ring-white/5"
        >
          <div className="max-h-64 overflow-y-auto p-1.5">
            {options.map((o) => {
              const active = o.value === value;
              return (
                <button
                  key={o.value || "__all"}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-2 rounded-xl px-4 py-2.5 text-start text-sm transition-colors ${
                    active
                      ? "bg-primary/10 font-semibold text-primary"
                      : "text-foreground hover:bg-muted"
                  }`}
                >
                  <span className="truncate">{o.label}</span>
                  {active ? <Check className="size-4 shrink-0" /> : null}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
