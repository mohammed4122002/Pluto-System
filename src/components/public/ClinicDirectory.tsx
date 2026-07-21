"use client";

import { useMemo, useState } from "react";
import { MapPin, Search, SlidersHorizontal } from "lucide-react";

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 -translate-y-1/2 size-4 text-muted-foreground start-3" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث باسم العيادة أو الطبيب أو التخصص..."
            className="w-full rounded-full border border-border bg-background py-2.5 ps-9 pe-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <div className="relative sm:w-56">
          <MapPin className="pointer-events-none absolute top-1/2 -translate-y-1/2 size-4 text-muted-foreground start-3" />
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full appearance-none rounded-full border border-border bg-background py-2.5 ps-9 pe-8 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">كل المدن</option>
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <SlidersHorizontal className="pointer-events-none absolute top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground end-3" />
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        {filtered.length} عيادة
        {city ? ` في ${city}` : ""}
      </p>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/70 py-16 text-center text-sm text-muted-foreground">
          لا توجد عيادات مطابقة{city ? ` في ${city}` : ""}. جرّب مدينة أخرى أو غيّر البحث.
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
