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
};

export default async function PublicClinicsPage() {
  const admin = getAdminSupabase();
  const { data } = await admin
    .from("clinics")
    .select(
      "id, name, doctor_name, specialty, city, country, address, phone, instagram_url, facebook_url, logo_url, status, channels:clinic_channels(channel, is_enabled, wa_provider, twilio_whatsapp_from)"
    )
    .in("status", ["trial", "active"])
    .order("name", { ascending: true });

  const clinics: PublicClinic[] = (data ?? []).map((c) => {
    const channels = (c.channels ?? []) as ChannelRow[];
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
    };
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/70">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center gap-2 font-bold">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Stethoscope className="size-4" />
            </span>
            MediSync
          </Link>
          <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">
            دخول العيادات
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold sm:text-3xl">دليل العيادات</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            اختر مدينتك لعرض العيادات القريبة منك، واحجز موعدك مباشرة عبر واتساب.
          </p>
        </div>

        {clinics.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/70 py-16 text-center text-sm text-muted-foreground">
            لا توجد عيادات متاحة حالياً.
          </div>
        ) : (
          <ClinicDirectory clinics={clinics} />
        )}
      </main>
    </div>
  );
}
