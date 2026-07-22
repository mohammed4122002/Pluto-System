import Link from "next/link";
import { Stethoscope } from "lucide-react";

import { getAdminSupabase } from "@/lib/supabase/admin";
import { ClinicDirectory } from "@/components/public/ClinicDirectory";
import type { PublicClinic } from "@/components/public/ClinicCard";

export const metadata = {
  title: "دليل العيادات | MediSync",
  description: "استعرض العيادات، صفِّ حسب مدينتك، واحجز موعدك مباشرة.",
};

// Public directory — no auth. Reads a safe, curated subset of active clinics
// with the admin client (never exposes channel tokens or DB config). The WA
// booking number comes from the clinic's own WhatsApp channel row.
// Rendered on demand (like every other data page) so the build never needs a
// live DB connection to prerender it.
export const dynamic = "force-dynamic";

type ChannelRow = {
  channel: string;
  is_enabled: boolean | null;
  wa_provider: string | null;
  twilio_whatsapp_from: string | null;
  telegram_bot_token?: string | null;
  telegram_bot_username?: string | null;
};

export default async function PublicClinicsPage() {
  const admin = getAdminSupabase();
  const { data } = await admin
    .from("clinics")
    .select(
      "id, name, doctor_name, specialty, city, country, address, phone, instagram_url, facebook_url, logo_url, status, channels:clinic_channels(channel, is_enabled, wa_provider, twilio_whatsapp_from), automation:clinic_automation(working_hours_start, working_hours_end)"
    )
    .in("status", ["trial", "active"])
    .order("name", { ascending: true });

  const clinics: PublicClinic[] = (data ?? []).map((c) => {
    const channels = (c.channels ?? []) as ChannelRow[];
    const automation = Array.isArray(c.automation) ? c.automation[0] : c.automation;
    const wa = channels.find((ch) => ch.channel === "whatsapp" && ch.is_enabled);
    const waDigits = wa?.twilio_whatsapp_from
      ? wa.twilio_whatsapp_from.replace(/\D/g, "")
      : "";
    return {
      id: c.id as string,
      name: (c.name as string) ?? "",
      doctor_name: (c.doctor_name as string) ?? "",
      specialty: (c.specialty as string | null) ?? null,
      city: (c.city as string | null) ?? null,
      country: (c.country as string | null) ?? null,
      address: (c.address as string | null) ?? null,
      phone: (c.phone as string | null) ?? null,
      instagram_url: (c.instagram_url as string | null) ?? null,
      facebook_url: (c.facebook_url as string | null) ?? null,
      logo_url: (c.logo_url as string | null) ?? null,
      whatsapp: waDigits || null,
      telegram_bot_username: null,
      working_hours_start: (automation?.working_hours_start as string | null) ?? null,
      working_hours_end: (automation?.working_hours_end as string | null) ?? null,
    };
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* الرأس */}
      <header className="border-b border-border/70 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg hover:opacity-80 transition-opacity">
            <span className="flex size-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-sm">
              <Stethoscope className="size-5" />
            </span>
            <span className="bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">MediSync</span>
          </Link>
          <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
            دخول العيادات
          </Link>
        </div>
      </header>

      <main className="flex-1 mx-auto max-w-6xl w-full px-4 py-8 sm:py-12">
        {/* صفحة البطل */}
        <div className="mb-12 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold leading-tight">
            <span className="bg-gradient-to-r from-primary via-primary/90 to-primary/70 bg-clip-text text-transparent">
              اكتشف أفضل العيادات
            </span>
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            ابحث عن العيادة المناسبة حسب مدينتك وتخصصك، واحجز موعدك مباشرة بكل سهولة.
          </p>
          <div className="mt-2 flex items-center justify-center gap-2 text-sm text-muted-foreground/80">
            <div className="h-1 w-8 rounded-full bg-primary/40" />
            <span className="font-medium">{clinics.length} عيادة متاحة الآن</span>
            <div className="h-1 w-8 rounded-full bg-primary/40" />
          </div>
        </div>

        {clinics.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/50 bg-muted/20 py-16 px-4 text-center">
            <Stethoscope className="mx-auto mb-4 size-10 text-muted-foreground/50" />
            <h2 className="font-semibold text-foreground mb-2">لا توجد عيادات متاحة</h2>
            <p className="text-sm text-muted-foreground">سيتم إضافة عيادات جديدة قريباً</p>
          </div>
        ) : (
          <ClinicDirectory clinics={clinics} />
        )}
      </main>

      {/* الفوتر */}
      <footer className="border-t border-border/70 mt-auto bg-card/30 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-4 py-6 text-center text-sm text-muted-foreground">
          <p>© 2026 MediSync. جميع الحقوق محفوظة.</p>
        </div>
      </footer>
    </div>
  );
}
