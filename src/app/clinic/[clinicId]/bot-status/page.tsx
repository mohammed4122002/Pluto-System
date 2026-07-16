import { MessagesSquare, AlertTriangle, CalendarClock, Radio } from "lucide-react";

import { getAdminSupabase } from "@/lib/supabase/admin";
import { requireClinicRole } from "@/lib/auth/require-clinic-role";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiCard } from "@/components/admin/KpiCard";
import { ChannelHealthPanel } from "@/components/clinic/ChannelHealthPanel";

export default async function BotStatusPage({
  params,
}: {
  params: Promise<{ clinicId: string }>;
}) {
  const { clinicId } = await params;
  await requireClinicRole(clinicId, ["manager"]);
  const admin = getAdminSupabase();

  const nowIso = new Date().toISOString();
  const [channelsRes, convRes, attnRes, apptRes] = await Promise.all([
    admin
      .from("clinic_channels")
      .select("channel, is_enabled")
      .eq("clinic_id", clinicId),
    admin
      .from("conversations")
      .select("id", { count: "exact", head: true })
      .eq("clinic_id", clinicId),
    admin
      .from("conversations")
      .select("id", { count: "exact", head: true })
      .eq("clinic_id", clinicId)
      .eq("needs_attention", true),
    admin
      .from("unified_appointments")
      .select("id", { count: "exact", head: true })
      .eq("clinic_id", clinicId)
      .eq("deleted", false)
      .eq("status", "scheduled")
      .gt("appointment_time", nowIso),
  ]);

  const activeChannels = (channelsRes.data ?? []).filter(
    (c) => c.is_enabled && (c.channel === "telegram" || c.channel === "whatsapp")
  ).length;
  const conversations = convRes.count ?? 0;
  const needsAttention = attnRes.count ?? 0;
  const upcoming = apptRes.count ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="حالة البوت"
        description="اطمئن على أن مساعدك الذكي متصل ويعمل — حالة القنوات ونشاط البوت في مكان واحد"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="قنوات مفعّلة" value={activeChannels} icon={Radio} tone="default" />
        <KpiCard label="محادثات" value={conversations} icon={MessagesSquare} tone="default" />
        <KpiCard
          label="تحتاج انتباه"
          value={needsAttention}
          icon={AlertTriangle}
          tone={needsAttention > 0 ? "warning" : "success"}
        />
        <KpiCard label="مواعيد قادمة" value={upcoming} icon={CalendarClock} tone="success" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">حالة اتصال القنوات</CardTitle>
        </CardHeader>
        <CardContent>
          <ChannelHealthPanel clinicId={clinicId} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">كيف يعمل مساعدك الذكي؟</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            🤖 يرد على المرضى تلقائياً عبر تيليجرام وواتساب: يجيب على الاستفسارات، ويحجز
            ويلغي المواعيد، ويتعامل مع الصور والرسائل الصوتية.
          </p>
          <p>
            🔔 يرسل تذكيرات المواعيد وطلبات التقييم في أوقاتها دون تدخّل منك.
          </p>
          <p>
            ✅ إذا ظهرت قناة بحالة «يحتاج إصلاح»، غالباً التوكن منتهي الصلاحية — جدّده من
            إعدادات المزوّد (Meta أو Twilio) ثم أعد الفحص.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
