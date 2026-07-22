import Link from "next/link";
import {
  ArrowLeft,
  BellRing,
  Bot,
  CalendarClock,
  Check,
  Database,
  LayoutDashboard,
  Lock,
  MessageCircle,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  Zap,
  Server,
  Sheet,
  Workflow,
  Wallet,
  Stethoscope,
  TrendingUp,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PLANS } from "@/lib/pricing";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { FeaturedClinicsClient } from "@/components/home/FeaturedClinicsClient";
import type { PublicClinic } from "@/components/public/ClinicCard";

const INTEGRATIONS = [
  { icon: MessageCircle, label: "WhatsApp Business" },
  { icon: Send, label: "Telegram" },
  { icon: Database, label: "Supabase" },
  { icon: Workflow, label: "n8n" },
  { icon: Server, label: "SQL Server" },
  { icon: Sheet, label: "Google Sheets" },
];

const features = [
  {
    icon: Bot,
    title: "سكرتير ذكاء اصطناعي يرد على مرضاك",
    description:
      "مساعد محادثة على واتساب وتيليجرام يجيب على أسئلة المرضى ويحجز ويلغي المواعيد بلغة طبيعية — على مدار الساعة وبأسلوب موظف الاستقبال الحقيقي.",
  },
  {
    icon: Sparkles,
    title: "تحليلات وتنبيهات تلقائية بالذكاء الاصطناعي",
    description:
      "ملخص يومي لأداء كل عيادة مع تنبيهات (ارتفاع نسبة عدم الحضور، لا مواعيد قادمة) وتوصيات عملية — يقرأ بياناتك ويخبرك بما يستحق انتباهك.",
  },
  {
    icon: BellRing,
    title: "تذكير تلقائي بالمواعيد",
    description:
      "رسالة واتساب أو تيليجرام تصل للمريض قبل موعده بالوقت الذي تحدده أنت — مع أزرار تأكيد/إلغاء، وبدون أي تدخل من موظفيك.",
  },
  {
    icon: Star,
    title: "تقييم بعد كل زيارة",
    description:
      "بعد انتهاء الزيارة يصل المريض طلب تقييم من ١ إلى ٥ نجوم مع تعليق اختياري — لتعرف رأي مرضاك لحظة بلحظة.",
  },
  {
    icon: LayoutDashboard,
    title: "لوحة تحكم لعيادتك",
    description:
      "مواعيد اليوم، حالة كل تذكير، التقييمات ومتوسطها، وتقارير أسبوعية وشهرية — كلها في شاشة واحدة بالعربي.",
  },
  {
    icon: Database,
    title: "قاعدة بيانات موحّدة تزامن في الاتجاهين",
    description:
      "نجمع بيانات عيادتك من Supabase أو SQL Server أو Google Sheets في مكان واحد، وأي تعديل في اللوحة يتزامن تلقائياً مع نظامك والعكس — بدون تغيير طريقة عملك.",
  },
  {
    icon: Users,
    title: "صلاحيات لكل موظف",
    description:
      "السكرتيرة تدير المواعيد، الطبيب يرى تقييماته، والمدير يطّلع على كل شيء — كل دور يرى ما يخصه فقط.",
  },
  {
    icon: ShieldCheck,
    title: "أمان على مستوى المنصات",
    description:
      "بيانات كل عيادة معزولة تماماً عن غيرها، مع تشفير للرموز السرية وحماية على مستوى الصفوف في قاعدة البيانات.",
  },
];

const steps = [
  {
    number: "١",
    title: "نجهّز عيادتك خلال دقائق",
    description:
      "نضيف بيانات عيادتك ورقم الواتساب الخاص بها ونربطها بقاعدة بياناتك — أنت لا تحتاج لأي خطوة تقنية.",
  },
  {
    number: "٢",
    title: "الأتمتة تشتغل من أول موعد",
    description:
      "كل موعد جديد في نظامك يُرصد تلقائياً، ويصل التذكير للمريض على واتساب في الوقت المحدد بالضبط.",
  },
  {
    number: "٣",
    title: "تابع النتائج من لوحة التحكم",
    description:
      "شاهد حالة التذكيرات لحظياً، واقرأ تقييمات المرضى وتعليقاتهم، وحمّل تقارير الأداء متى شئت.",
  },
];

const planOrder = ["monthly", "quarterly", "annual"] as const;

type ChannelRow = {
  channel: string;
  is_enabled: boolean | null;
  wa_provider: string | null;
  twilio_whatsapp_from: string | null;
};

export default async function LandingPage() {
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
    <div className="flex min-h-screen flex-col bg-background">
      {/* ===== Navbar ===== */}
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/70 shadow-[0_1px_0_0_rgba(0,0,0,0.02)] backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="group flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-brand ring-inset-highlight transition-transform group-hover:scale-105">
              <MessageCircle className="size-5" />
            </span>
            <span className="text-lg font-extrabold tracking-tight">
              MediSync <span className="text-primary">AI</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 rounded-full border border-border/60 bg-muted/40 p-1 text-sm font-medium text-muted-foreground md:flex">
            <a
              href="#features"
              className="rounded-full px-4 py-1.5 transition-colors hover:bg-background hover:text-foreground hover:shadow-brand-sm"
            >
              المميزات
            </a>
            <a
              href="#how"
              className="rounded-full px-4 py-1.5 transition-colors hover:bg-background hover:text-foreground hover:shadow-brand-sm"
            >
              كيف تعمل
            </a>
            <a
              href="#pricing"
              className="rounded-full px-4 py-1.5 transition-colors hover:bg-background hover:text-foreground hover:shadow-brand-sm"
            >
              الأسعار
            </a>
            <Link
              href="/clinics"
              className="rounded-full px-4 py-1.5 transition-colors hover:bg-background hover:text-foreground hover:shadow-brand-sm"
            >
              دليل العيادات
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" className="text-muted-foreground">
              <Link href="/login">دخول العيادات</Link>
            </Button>
            <Button asChild>
              <Link href="/login">ابدأ الآن</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* ===== Hero ===== */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(16,185,129,0.12),transparent)]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[560px] bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(16,185,129,0.15),transparent)]"
          />
          <div className="mx-auto grid w-full max-w-6xl items-center gap-14 px-4 pb-20 pt-16 sm:px-6 lg:grid-cols-2 lg:pt-24">
            <div className="text-center lg:text-start">
              <Badge
                variant="outline"
                className="mb-6 gap-1.5 border-emerald-200/70 bg-gradient-to-b from-emerald-50 to-emerald-50/50 px-3.5 py-1.5 text-emerald-700 shadow-brand-sm dark:border-emerald-800/40 dark:from-emerald-950/40 dark:text-emerald-300"
              >
                <Zap className="size-3.5 fill-emerald-500 text-emerald-500" />
                منصة عيادات مدعومة بالذكاء الاصطناعي — بدون أي جهد تقني
              </Badge>

              <h1 className="text-balance text-4xl font-extrabold leading-[1.12] tracking-tight sm:text-5xl lg:text-[3.4rem]">
                عيادتك تتواصل مع مرضاها
                <span className="bg-gradient-to-l from-emerald-600 via-emerald-500 to-teal-500 bg-clip-text text-transparent">
                  {" "}
                  تلقائياً
                </span>
              </h1>

              <p className="mx-auto mt-5 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground lg:mx-0">
                سكرتير ذكاء اصطناعي يرد على مرضاك ويحجز المواعيد، وتذكير قبل كل
                موعد، وطلب تقييم بعد كل زيارة — عبر واتساب وتيليجرام وبشكل آلي
                بالكامل، مع لوحة تحكم وتحليلات ذكية لكل عيادة.
              </p>

              <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row lg:justify-start sm:justify-center">
                <Button asChild size="lg" className="gap-2">
                  <Link href="/login">
                    ابدأ تجربتك المجانية
                    <ArrowLeft className="size-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <a href="#pricing">شاهد الأسعار</a>
                </Button>
              </div>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground lg:justify-start">
                <span className="flex items-center gap-1.5">
                  <Check className="size-4 text-emerald-600" />
                  إعداد خلال دقائق
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="size-4 text-emerald-600" />
                  بدون تغيير نظامك الحالي
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="size-4 text-emerald-600" />
                  دعم كامل بالعربي
                </span>
              </div>
            </div>

            {/* WhatsApp conversation mockup */}
            <div className="relative mx-auto w-full max-w-sm">
              <div
                aria-hidden
                className="absolute -inset-8 rounded-[3rem] bg-gradient-to-br from-emerald-200/70 via-teal-100/50 to-transparent blur-3xl"
              />
              <div className="relative rounded-[2rem] border border-border/60 bg-card p-3 shadow-brand-lg ring-inset-highlight">
                <div className="rounded-[1.5rem] bg-[#e5ddd5] p-3 dark:bg-neutral-800">
                  {/* chat header */}
                  <div className="mb-3 flex items-center gap-3 rounded-xl bg-[#075e54] px-4 py-3 text-white">
                    <span className="flex size-9 items-center justify-center rounded-full bg-white/20 text-sm font-bold">
                      ع
                    </span>
                    <div className="leading-tight">
                      <p className="text-sm font-bold">عيادة د. أحمد</p>
                      <p className="text-[11px] text-emerald-100">
                        متصل الآن
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2.5 px-1 pb-1">
                    {/* clinic reminder bubble */}
                    <div className="max-w-[85%] rounded-xl rounded-ts-sm bg-white p-3 text-[13px] leading-relaxed shadow-sm dark:bg-neutral-700">
                      مرحباً أ. سارة 👋
                      <br />
                      نذكّرك بموعدك مع <b>د. أحمد</b> اليوم الساعة{" "}
                      <b>
                        <span dir="ltr">05:30</span> مساءً
                      </b>
                      . نتشرف بحضورك 🌿
                    </div>

                    {/* patient reply */}
                    <div className="ms-auto max-w-[70%] rounded-xl rounded-te-sm bg-[#dcf8c6] p-3 text-[13px] shadow-sm dark:bg-emerald-900/60">
                      شكراً لكم، سأكون هناك 👍
                    </div>

                    {/* rating request */}
                    <div className="max-w-[85%] rounded-xl rounded-ts-sm bg-white p-3 text-[13px] leading-relaxed shadow-sm dark:bg-neutral-700">
                      نتمنى أن تكون زيارتك ممتعة!
                      <br />
                      قيّم تجربتك مع <b>د. أحمد</b> من <b>١</b> إلى <b>٥</b> ⭐
                    </div>

                    {/* patient rating */}
                    <div className="ms-auto max-w-[70%] rounded-xl rounded-te-sm bg-[#dcf8c6] p-3 text-[13px] shadow-sm dark:bg-emerald-900/60">
                      ٥ ⭐ خدمة ممتازة والدكتور رائع
                    </div>
                  </div>
                </div>

                {/* floating stat card */}
                <div className="absolute -bottom-6 -start-6 flex items-center gap-3 rounded-2xl border border-border/60 bg-card px-4 py-3 shadow-brand-lg ring-inset-highlight">
                  <span className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-brand-sm">
                    <Star className="size-5 fill-current" />
                  </span>
                  <div className="leading-tight">
                    <p className="text-lg font-extrabold" dir="ltr">
                      4.9
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      متوسط تقييم المرضى
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== Integrations trust bar ===== */}
        <section className="border-y border-border/60 bg-card/40">
          <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
            <p className="mb-4 text-center text-xs font-medium text-muted-foreground">
              يعمل مع الأدوات التي تستخدمها عيادتك بالفعل
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
              {INTEGRATIONS.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-2 text-muted-foreground/80 grayscale transition-all hover:text-foreground hover:grayscale-0"
                >
                  <item.icon className="size-4" />
                  <span className="text-sm font-medium" dir="ltr">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== Stats strip ===== */}
        <section className="border-y border-border/60 bg-muted/40">
          <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-6 px-4 py-10 text-center sm:px-6 md:grid-cols-4">
            {[
              { value: "-٤٠٪", label: "انخفاض في المواعيد الضائعة" },
              { value: "٢٤/٧", label: "يعمل بلا توقف طوال الأسبوع" },
              { value: "٩٨٪", label: "من الرسائل تُقرأ على واتساب" },
              { value: "٥ دقائق", label: "متوسط زمن تجهيز العيادة" },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-3xl font-extrabold text-emerald-600">
                  {stat.value}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ===== Dashboard preview ===== */}
        <section className="scroll-mt-20">
          <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
            <div className="grid items-center gap-14 lg:grid-cols-2">
              <div className="order-2 text-center lg:order-1 lg:text-start">
                <Badge
                  variant="outline"
                  className="mb-4 border-emerald-200 bg-emerald-50 text-emerald-700"
                >
                  لوحة التحكم
                </Badge>
                <h2 className="text-balance text-3xl font-extrabold tracking-tight sm:text-4xl">
                  كل تفاصيل عيادتك في شاشة واحدة
                </h2>
                <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
                  إيراد شهري، تذكيرات اليوم، تقييمات المرضى، وسجل تنفيذ كل
                  رسالة — بتحديث لحظي وبدون الحاجة لفتح واتساب أو ملف إكسل.
                </p>
                <ul className="mt-6 space-y-3 text-sm">
                  {[
                    "نظرة عامة فورية على أداء كل عيادة",
                    "تنبيهات تلقائية عند اقتراب انتهاء الاشتراك",
                    "سجل كامل لكل رسالة أُرسلت ونتيجتها",
                  ].map((item) => (
                    <li
                      key={item}
                      className="flex items-center justify-center gap-2.5 lg:justify-start"
                    >
                      <Check className="size-4 shrink-0 text-emerald-600" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="relative order-1 lg:order-2">
                <div
                  aria-hidden
                  className="absolute -inset-6 rounded-[2.5rem] bg-gradient-to-br from-emerald-200/50 via-teal-100/30 to-transparent blur-2xl"
                />
                <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card shadow-brand-lg ring-inset-highlight">
                  <div className="flex items-center gap-1.5 border-b border-border bg-muted/40 px-4 py-2.5">
                    <span className="size-2.5 rounded-full bg-destructive/50" />
                    <span className="size-2.5 rounded-full bg-warning/50" />
                    <span className="size-2.5 rounded-full bg-success/50" />
                  </div>
                  <div className="space-y-4 p-5">
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { icon: Stethoscope, label: "العيادات النشطة", value: "١٢" },
                        { icon: Wallet, label: "الإيراد الشهري", value: "٤٬٤٨٠ ر.س" },
                        { icon: BellRing, label: "تذكيرات اليوم", value: "٣٨" },
                        { icon: Star, label: "متوسط التقييم", value: "٤.٩" },
                      ].map((kpi) => (
                        <div
                          key={kpi.label}
                          className="rounded-xl border border-border bg-background p-3"
                        >
                          <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <kpi.icon className="size-4" />
                          </span>
                          <p dir="ltr" className="mt-2 text-end text-lg font-extrabold">
                            {kpi.value}
                          </p>
                          <p className="text-xs text-muted-foreground">{kpi.label}</p>
                        </div>
                      ))}
                    </div>

                    <div className="rounded-xl border border-border bg-background p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-xs font-semibold text-muted-foreground">
                          النشاط الأخير
                        </p>
                        <TrendingUp className="size-3.5 text-success" />
                      </div>
                      <div className="space-y-2">
                        {[
                          { clinic: "عيادة الشفاء", type: "تذكير موعد", ok: true },
                          { clinic: "مركز النور", type: "طلب تقييم", ok: true },
                          { clinic: "عيادة د. أحمد", type: "تذكير موعد", ok: true },
                        ].map((row, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between text-xs"
                          >
                            <span className="font-medium">{row.clinic}</span>
                            <span className="text-muted-foreground">{row.type}</span>
                            <Badge variant="success" className="h-5">
                              نجاح
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== Features ===== */}
        <section id="features" className="scroll-mt-20 bg-muted/20">
          <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <Badge
                variant="outline"
                className="mb-4 border-emerald-200 bg-emerald-50 text-emerald-700"
              >
                المميزات
              </Badge>
              <h2 className="text-balance text-3xl font-extrabold tracking-tight sm:text-4xl">
                كل ما تحتاجه عيادتك للتواصل مع المرضى
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                صُمّمت المنصة خصيصاً للعيادات في العالم العربي — واجهة عربية
                بالكامل، وأتمتة تعمل بصمت في الخلفية.
              </p>
            </div>

            <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="group rounded-2xl border border-border/70 bg-card p-6 shadow-brand-sm transition-all duration-200 hover:-translate-y-1 hover:border-primary/25 hover:shadow-brand"
                >
                  <span className="mb-4 flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-brand-sm transition-all duration-200 group-hover:bg-gradient-to-br group-hover:from-emerald-500 group-hover:to-teal-600 group-hover:text-white group-hover:shadow-brand">
                    <feature.icon className="size-5" />
                  </span>
                  <h3 className="mb-2 text-lg font-bold">{feature.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== How it works ===== */}
        <section id="how" className="scroll-mt-20 bg-muted/40">
          <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <Badge
                variant="outline"
                className="mb-4 border-emerald-200 bg-emerald-50 text-emerald-700"
              >
                كيف تعمل
              </Badge>
              <h2 className="text-balance text-3xl font-extrabold tracking-tight sm:text-4xl">
                ثلاث خطوات وتشتغل الأتمتة
              </h2>
            </div>

            <div className="mt-14 grid gap-8 md:grid-cols-3">
              {steps.map((step, i) => (
                <div key={step.title} className="relative">
                  {i < steps.length - 1 && (
                    <div
                      aria-hidden
                      className="absolute start-full top-8 hidden h-px w-8 -translate-x-0 bg-gradient-to-l from-emerald-300 to-transparent md:block"
                    />
                  )}
                  <div className="rounded-2xl border border-border bg-card p-6">
                    <span className="mb-4 flex size-12 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-xl font-extrabold text-white shadow-md shadow-emerald-500/25">
                      {step.number}
                    </span>
                    <h3 className="mb-2 text-lg font-bold">{step.title}</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== Pricing ===== */}
        <section id="pricing" className="scroll-mt-20">
          <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <Badge
                variant="outline"
                className="mb-4 border-emerald-200 bg-emerald-50 text-emerald-700"
              >
                الأسعار
              </Badge>
              <h2 className="text-balance text-3xl font-extrabold tracking-tight sm:text-4xl">
                باقة واحدة بكل المميزات — اختر مدة الاشتراك
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                كل الباقات تشمل التذكيرات والتقييمات ولوحة التحكم الكاملة، بلا
                حدود على عدد الرسائل.
              </p>
            </div>

            <div className="mt-14 grid gap-6 md:grid-cols-3">
              {planOrder.map((key) => {
                const plan = PLANS[key];
                const highlighted = "badge" in plan;
                return (
                  <div
                    key={key}
                    className={
                      highlighted
                        ? "relative rounded-2xl border border-primary/30 bg-card p-7 shadow-brand-lg ring-2 ring-primary/15 md:-my-3 md:scale-105"
                        : "relative rounded-2xl border border-border/70 bg-card p-7 shadow-brand-sm transition-shadow hover:shadow-brand"
                    }
                  >
                    {highlighted && (
                      <Badge className="absolute -top-3.5 start-1/2 -translate-x-1/2 md:start-6 md:translate-x-0">
                        ⭐ {plan.badge}
                      </Badge>
                    )}
                    <h3 className="text-lg font-bold">{plan.label}</h3>
                    <div className="mt-4 flex items-baseline gap-1.5">
                      <span className="text-4xl font-extrabold" dir="ltr">
                        {plan.pricePerMonth}
                      </span>
                      <span className="text-muted-foreground">ر.س / شهر</span>
                    </div>
                    <p className="mt-1.5 text-sm text-muted-foreground">
                      {plan.months === 1 ? (
                        "تُدفع شهرياً"
                      ) : (
                        <>
                          <span dir="ltr">{plan.totalSar}</span> ر.س تُدفع مرة
                          واحدة
                          {plan.savingsSar > 0 && (
                            <>
                              {" "}
                              — توفّر <span dir="ltr">{plan.savingsSar}</span>{" "}
                              ر.س
                            </>
                          )}
                        </>
                      )}
                    </p>

                    <ul className="mt-6 space-y-3 text-sm">
                      {[
                        "تذكيرات مواعيد غير محدودة",
                        "تقييمات ما بعد الزيارة",
                        "لوحة تحكم كاملة لفريقك",
                        "ربط بقاعدة بيانات عيادتك",
                        "دعم فني بالعربي",
                      ].map((item) => (
                        <li key={item} className="flex items-center gap-2.5">
                          <Check className="size-4 shrink-0 text-emerald-600" />
                          {item}
                        </li>
                      ))}
                    </ul>

                    <Button
                      asChild
                      className="mt-7 w-full"
                      variant={highlighted ? "default" : "outline"}
                    >
                      <Link href="/login">اشترك الآن</Link>
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ===== Featured Clinics ===== */}
        {clinics.length > 0 && <FeaturedClinicsClient initialClinics={clinics} />}

        {/* ===== CTA band ===== */}
        <section className="mx-auto w-full max-w-6xl px-4 pb-20 sm:px-6">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-emerald-600 to-teal-700 px-8 py-14 text-center text-white shadow-2xl shadow-emerald-900/20">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(40%_60%_at_70%_20%,rgba(255,255,255,0.15),transparent)]"
            />
            <CalendarClock className="mx-auto mb-5 size-10 opacity-90" />
            <h2 className="text-balance text-3xl font-extrabold sm:text-4xl">
              جاهز توقف نزيف المواعيد الضائعة؟
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-emerald-50">
              انضم للعيادات التي أتمتت تواصلها مع المرضى — التجهيز يستغرق دقائق
              ولا يتطلب أي خبرة تقنية.
            </p>
            <Button
              asChild
              size="lg"
              className="mt-8 h-12 gap-2 bg-white px-8 text-base font-bold text-emerald-700 hover:bg-emerald-50"
            >
              <Link href="/login">
                ابدأ الآن
                <ArrowLeft className="size-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      {/* ===== Footer ===== */}
      <footer className="border-t border-border/60 bg-muted/30">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:px-6">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
              <MessageCircle className="size-4" />
            </span>
            <span>
              MediSync AI © <span dir="ltr">2026</span> — جميع الحقوق محفوظة
            </span>
          </div>
          <nav className="flex items-center gap-6">
            <Link
              href="/login"
              className="transition-colors hover:text-foreground"
            >
              دخول العيادات
            </Link>
            <Link
              href="/admin"
              className="flex items-center gap-1.5 transition-colors hover:text-foreground"
            >
              <Lock className="size-3.5" />
              بوابة الإدارة
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
