"use client";

import { useMemo, useState } from "react";
import { MapPin, Search, X } from "lucide-react";

import { ClinicCard, type PublicClinic } from "./ClinicCard";

export function ClinicDirectory({ clinics }: { clinics: PublicClinic[] }) {
  const cities = useMemo(() => {
    const set = new Set<string>();
    for (const c of clinics) {
      const city = (c.city ?? "").trim();
      if (city) set.add(city);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "ar"));
  }, [clinics]);

  const [city, setCity] = useState<string>("");
  const [query, setQuery] = useState<string>("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return clinics.filter((c) => {
      const cityOk = !city || (c.city ?? "").trim() === city;
      const qOk =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.doctor_name.toLowerCase().includes(q) ||
        (c.specialty ?? "").toLowerCase().includes(q);
      return cityOk && qOk;
    });
  }, [clinics, city, query]);

  const activeFilters = [city, query].filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* رأس البحث والفلترة */}
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          {/* البحث */}
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 -translate-y-1/2 size-4 text-muted-foreground start-3" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث باسم العيادة أو الطبيب أو التخصص..."
              className="w-full rounded-xl border border-border bg-background py-3 ps-10 pe-4 text-sm placeholder-muted-foreground outline-none transition-colors hover:border-border/80 focus-visible:ring-2 focus-visible:ring-primary/30"
            />
          </div>

          {/* فلتر المنطقة/المدينة */}
          <div className="relative sm:min-w-max">
            <MapPin className="pointer-events-none absolute top-1/2 -translate-y-1/2 size-4 text-muted-foreground start-3" />
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full appearance-none rounded-xl border border-border bg-background py-3 ps-10 pe-10 text-sm outline-none transition-colors hover:border-border/80 focus-visible:ring-2 focus-visible:ring-primary/30"
            >
              <option value="">كل المدن</option>
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute top-1/2 -translate-y-1/2 end-3 flex items-center gap-1 text-muted-foreground">
              {city && <div className="size-2 rounded-full bg-primary" />}
              <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>
          </div>
        </div>

        {/* شريط الفلاترز النشطة */}
        {activeFilters > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">الفلاترز:</span>
            {query && (
              <button
                onClick={() => setQuery("")}
                className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs text-primary hover:bg-primary/20 transition-colors"
              >
                "{query}"
                <X className="size-3" />
              </button>
            )}
            {city && (
              <button
                onClick={() => setCity("")}
                className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs text-primary hover:bg-primary/20 transition-colors"
              >
                {city}
                <X className="size-3" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* نتائج البحث */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">
          <span className="text-primary font-bold">{filtered.length}</span>
          <span className="text-muted-foreground ms-1">
            {filtered.length === 0 ? "عيادة" : filtered.length === 1 ? "عيادة" : "عيادات"}
          </span>
          {city && <span className="text-muted-foreground ms-1">في {city}</span>}
        </p>
      </div>

      {/* شبكة العيادات */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/50 bg-muted/20 py-16 px-4 text-center">
          <MapPin className="mx-auto mb-3 size-8 text-muted-foreground/50" />
          <h3 className="font-medium text-foreground mb-1">لا توجد عيادات متطابقة</h3>
          <p className="text-sm text-muted-foreground">
            {city ? `لم نجد عيادات في ${city}.` : "لم نجد عيادات توافق البحث."}{" "}
            {activeFilters > 0 && (
              <button
                onClick={() => {
                  setCity("");
                  setQuery("");
                }}
                className="text-primary hover:underline font-medium"
              >
                مسح الفلاترز
              </button>
            )}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <ClinicCard key={c.id} clinic={c} />
          ))}
        </div>
      )}
    </div>
  );
}
