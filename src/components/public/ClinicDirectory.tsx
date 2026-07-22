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
    <div className="space-y-8">
      {/* رأس البحث والفلترة */}
      <div className="space-y-5">
        {/* البحث والفلتر */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4">
          {/* البحث */}
          <div className="relative group">
            <Search className="pointer-events-none absolute top-1/2 -translate-y-1/2 size-5 text-primary/50 start-4 group-focus-within:text-primary transition-colors" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث عن عيادة..."
              className="w-full rounded-2xl border border-border/50 bg-background/50 py-3.5 ps-13 pe-5 text-sm placeholder-muted-foreground/60 outline-none transition-all hover:border-border/70 hover:bg-background focus-visible:border-primary/60 focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-primary/15 shadow-sm hover:shadow-md"
            />
          </div>

          {/* فلتر المنطقة/المدينة */}
          <div className="relative group">
            <MapPin className="pointer-events-none absolute top-1/2 -translate-y-1/2 size-5 text-primary/50 start-4 group-focus-within:text-primary transition-colors" />
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full appearance-none rounded-2xl border border-border/50 bg-background/50 py-3.5 ps-13 pe-12 text-sm outline-none transition-all hover:border-border/70 hover:bg-background focus-visible:border-primary/60 focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-primary/15 shadow-sm hover:shadow-md"
            >
              <option value="">كل المدن</option>
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute top-1/2 -translate-y-1/2 end-4 text-primary/50 group-focus-within:text-primary transition-colors">
              <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>
          </div>
        </div>

        {/* شريط الفلاترز النشطة */}
        {activeFilters > 0 && (
          <div className="flex items-center gap-2 flex-wrap pt-2">
            {query && (
              <button
                onClick={() => setQuery("")}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary/10 to-primary/5 px-4 py-2 text-sm font-medium text-primary hover:from-primary/15 hover:to-primary/10 transition-all active:scale-95 border border-primary/20"
              >
                <span className="text-xs opacity-70 me-0.5">🔍</span>
                {query}
                <X className="size-4 ms-1" />
              </button>
            )}
            {city && (
              <button
                onClick={() => setCity("")}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary/10 to-primary/5 px-4 py-2 text-sm font-medium text-primary hover:from-primary/15 hover:to-primary/10 transition-all active:scale-95 border border-primary/20"
              >
                <MapPin className="size-4" />
                {city}
                <X className="size-4 ms-1" />
              </button>
            )}
            {activeFilters > 0 && (
              <button
                onClick={() => {
                  setCity("");
                  setQuery("");
                }}
                className="text-xs text-muted-foreground hover:text-foreground font-medium ms-2 px-2 py-1 rounded-full hover:bg-muted transition-colors"
              >
                مسح الكل
              </button>
            )}
          </div>
        )}
      </div>

      {/* نتائج البحث */}
      <div className="flex items-center justify-between px-1">
        <div>
          <p className="text-sm text-muted-foreground">
            تم العثور على
            <span className="mx-2 inline-flex items-baseline gap-1 font-bold text-primary">
              <span className="text-xl">{filtered.length}</span>
              {filtered.length === 0 ? (
                <span>عيادة</span>
              ) : filtered.length === 1 ? (
                <span>عيادة</span>
              ) : (
                <span>عيادات</span>
              )}
            </span>
            {city && (
              <>
                <span className="text-muted-foreground">في</span>
                <span className="mx-1.5 font-semibold text-foreground">{city}</span>
              </>
            )}
          </p>
        </div>
      </div>

      {/* شبكة العيادات */}
      {filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border/40 bg-gradient-to-br from-muted/50 to-muted/20 py-20 px-4 text-center">
          <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-full bg-primary/10">
            <MapPin className="size-8 text-primary/60" />
          </div>
          <h3 className="text-lg font-bold text-foreground mb-2">لا توجد عيادات متطابقة</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6">
            {city ? `لم نجد عيادات في ${city}.` : "لم نجد عيادات توافق معايير البحث."}{" "}
          </p>
          {activeFilters > 0 && (
            <button
              onClick={() => {
                setCity("");
                setQuery("");
              }}
              className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-5 py-2.5 text-sm font-semibold text-primary hover:bg-primary/20 transition-all"
            >
              مسح جميع الفلاترز
            </button>
          )}
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
