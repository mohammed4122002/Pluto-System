"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, MapPin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClinicCard, type PublicClinic } from "@/components/public/ClinicCard";
import { FilterSelect } from "@/components/public/FilterSelect";

export function FeaturedClinicsClient({ initialClinics }: { initialClinics: PublicClinic[] }) {
  const [selectedCountry, setSelectedCountry] = useState<string>("");

  const countries = useMemo(() => {
    const set = new Set<string>();
    for (const clinic of initialClinics) {
      const country = (clinic.country ?? "").trim();
      if (country) set.add(country);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "ar"));
  }, [initialClinics]);

  const filteredClinics = useMemo(() => {
    return initialClinics
      .filter((c) => !selectedCountry || (c.country ?? "") === selectedCountry)
      .slice(0, 6);
  }, [initialClinics, selectedCountry]);

  return (
    <section className="scroll-mt-20">
      <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <Badge
            variant="outline"
            className="mb-4 border-emerald-200 bg-emerald-50 text-emerald-700"
          >
            دليل العيادات
          </Badge>
          <h2 className="text-balance text-3xl font-extrabold tracking-tight sm:text-4xl">
            اكتشف العيادات المتخصصة بالقرب منك
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            تصفح عيادات معروفة تستخدم منصة MediSync وتوفر تجربة حجز سلسة عبر
            الذكاء الاصطناعي
          </p>
        </div>

        {countries.length > 0 && (
          <div className="mt-8 flex justify-center">
            <div className="w-full max-w-xs">
              <FilterSelect
                value={selectedCountry}
                onChange={setSelectedCountry}
                ariaLabel="فلترة حسب الدولة"
                placeholder="كل الدول"
                icon={MapPin}
                options={[
                  { value: "", label: "كل الدول" },
                  ...countries.map((c) => ({ value: c, label: c })),
                ]}
              />
            </div>
          </div>
        )}

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredClinics.length > 0 ? (
            filteredClinics.map((clinic) => (
              <ClinicCard key={clinic.id} clinic={clinic} />
            ))
          ) : (
            <div className="col-span-full rounded-2xl border border-dashed border-border/50 bg-muted/20 py-12 px-4 text-center">
              <MapPin className="mx-auto mb-3 size-8 text-muted-foreground/50" />
              <h3 className="font-medium text-foreground mb-1">لا توجد عيادات متاحة</h3>
              <p className="text-sm text-muted-foreground">لم نجد عيادات في الدولة المختارة</p>
            </div>
          )}
        </div>

        <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button asChild size="lg" className="gap-2">
            <Link href="/clinics">
              اعرض دليل العيادات الكامل
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground" dir="ltr">
              {initialClinics.length}
            </span>{" "}
            عيادة متاحة الآن
          </p>
        </div>
      </div>
    </section>
  );
}
