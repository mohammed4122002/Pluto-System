import Link from "next/link";
import {
  ArrowLeft,
  BellRing,
  CalendarClock,
  Check,
  Database,
  LayoutDashboard,
  Lock,
  MessageCircle,
  ShieldCheck,
  Star,
  Users,
  Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PLANS } from "@/lib/pricing";

const features = [
  {
    icon: BellRing,
    title: "تذكير تلقائي بالمواعيد",
    description:
      "رسالة واتساب تصل للمريض قبل موعده بالوقت الذي تحدده أنت — بدون أي تدخل من موظفيك، وبدون مواعيد ضائعة.",
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
    title: "يعمل مع نظامك الحالي",
    description:
      "Supabase أو SQL Server أو حتى Google Sheets — نتصل بقاعدة بيانات عيادتك كما هي، بدون تغيير طريقة عملك.",
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

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* ===== Navbar ===== */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/25">
              <MessageCircle className="size-5" />
            </span>
            <span className="text-lg font-extrabold tracking-tight">
              MediSync <span className="text-emerald-600">AI</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
            <a href="#features" className="transition-colors hover:text-foreground">
              المميزات
            </a>
            <a href="#how" className="transition-colors hover:text-foreground">
              كيف تعمل
            </a>
            <a href="#pricing" className="transition-colors hover:text-foreground">
              الأسعار
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" className="text-muted-foreground">
              <Link href="/login">دخول العيادات</Link>
            </Button>
            <Button
              asChild
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
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
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(16,185,129,0.10),transparent)]"
          />
          <div className="mx-auto grid w-full max-w-6xl items-center gap-14 px-4 pb-20 pt-16 sm:px-6 lg:grid-cols-2 lg:pt-24">
            <div className="text-center lg:text-start">
              <Badge
                variant="outline"
                className="mb-5 gap-1.5 border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700"
              >
                <Zap className="size-3.5" />
                أتمتة واتساب للعيادات — بدون أي جهد تقني
              </Badge>

              <h1 className="text-balance text-4xl font-extrabold leading-[1.15] tracking-tight sm:text-5xl">
                عيادتك تتواصل مع مرضاها
                <span className="bg-gradient-to-l from-emerald-600 to-teal-500 bg-clip-text text-transparent">
                  {" "}
                  تلقائياً
                </span>
              </h1>

              <p className="mx-auto mt-5 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground lg:mx-0">
                تذكير بالمواعيد قبلها بساعات، وطلب تقييم بعد كل زيارة — كل ذلك
                عبر واتساب وبشكل آلي بالكامل، لتقليل المواعيد الضائعة ورفع رضا
                مرضاك.
              </p>

              <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row lg:justify-start sm:justify-center">
                <Button
                  asChild
                  size="lg"
                  className="h-12 gap-2 bg-emerald-600 px-7 text-base text-white hover:bg-emerald-700"
                >
                  <Link href="/login">
                    ابدأ تجربتك المجانية
                    <ArrowLeft className="size-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="h-12 px-7 text-base"
                >
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
                className="absolute -inset-6 rounded-[2.5rem] bg-gradient-to-br from-emerald-200/60 via-teal-100/40 to-transparent blur-2xl"
              />
              <div className="relative rounded-[2rem] border border-border bg-card p-3 shadow-2xl shadow-emerald-900/10">
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
                <div className="absolute -bottom-5 -start-5 flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-xl">
                  <span className="flex size-10 items-center justify-center rounded-full bg-amber-100 text-amber-600">
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

        {/* ===== Features ===== */}
        <section id="features" className="scroll-mt-20">
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
                  className="group rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-1 hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-500/5"
                >
                  <span className="mb-4 flex size-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 transition-colors group-hover:bg-emerald-600 group-hover:text-white">
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
                        ? "relative rounded-2xl border-2 border-emerald-500 bg-card p-7 shadow-xl shadow-emerald-500/10"
                        : "relative rounded-2xl border border-border bg-card p-7"
                    }
                  >
                    {highlighted && (
                      <Badge className="absolute -top-3 start-6 bg-emerald-600 text-white">
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
                      className={
                        highlighted
                          ? "mt-7 w-full bg-emerald-600 text-white hover:bg-emerald-700"
                          : "mt-7 w-full"
                      }
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
