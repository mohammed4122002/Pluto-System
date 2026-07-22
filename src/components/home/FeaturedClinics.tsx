import Link from "next/link";
import { ArrowLeft, MapPin } from "lucide-react";

import { getAdminSupabase } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClinicCard, type PublicClinic } from "@/components/public/ClinicCard";
import { FeaturedClinicsClient } from "./FeaturedClinicsClient";

type ChannelRow = {
  channel: string;
  is_enabled: boolean | null;
  wa_provider: string | null;
  twilio_whatsapp_from: string | null;
};

export async function FeaturedClinics() {
  try {
    const admin = getAdminSupabase();
    const { data } = await admin
      .from("clinics")
      .select(
        "id, name, doctor_name, specialty, city, country, address, phone, instagram_url, facebook_url, logo_url, status, channels:clinic_channels(channel, is_enabled, wa_provider, twilio_whatsapp_from), automation:clinic_automation(working_hours_start, working_hours_end)"
      )
      .in("status", ["trial", "active"])
      .order("name", { ascending: true });

    if (!data || data.length === 0) {
      return null;
    }

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
        working_hours_start: (automation?.working_hours_start as string | null) ?? null,
        working_hours_end: (automation?.working_hours_end as string | null) ?? null,
      };
    });

    return <FeaturedClinicsClient initialClinics={clinics} />;
  } catch (error) {
    console.error("Error fetching featured clinics:", error);
    return null;
  }
}
