// Structured "AI receptionist info" builder. The manager fills organized
// fields in a modal; this assembles them into the plain, readable Arabic
// string the AI agent actually reads (clinics.ai_info_text). The structured
// form itself is persisted separately (clinics.ai_info_form) so it can be
// reopened and edited.

export interface AiInfoService {
  name: string;
  price: string;
  note: string;
  instructions: string; // per-service patient instructions
}

// One practitioner the clinic offers. When the clinic has more than the
// owner doctor, the AI receptionist presents this roster ("here are our
// doctors, what each does, and their times — which suits you?") and books
// with the chosen one. When `team` is empty, the AI books with the clinic's
// single owner doctor directly.
export interface AiInfoDoctor {
  name: string;
  title: string; // specialty / role, e.g. "أخصائية جلدية وتجميل"
  services: string; // what they provide, free text
  schedule: string; // their working times, free text
}

export interface AiInfoForm {
  services: AiInfoService[];
  team: AiInfoDoctor[];
  working_hours: string;
  insurance: string;
  cancel_policy: string;
  late_policy: string;
}

export const EMPTY_AI_INFO: AiInfoForm = {
  services: [{ name: "", price: "", note: "", instructions: "" }],
  team: [],
  working_hours: "",
  insurance: "",
  cancel_policy: "",
  late_policy: "",
};

// Sensible starter content for a cosmetic clinic — used when a clinic has no
// saved structured info yet. All fields are editable.
export const SAMPLE_AI_INFO: AiInfoForm = {
  services: [
    { name: "استشارة أولى", price: "50 ₪", note: "تُخصم من قيمة أول جلسة", instructions: "" },
    {
      name: "تنظيف بشرة عميق",
      price: "120 ₪",
      note: "",
      instructions: "يُفضّل الحضور بدون مكياج.",
    },
    {
      name: "تقشير كيميائي",
      price: "200 ₪",
      note: "للجلسة",
      instructions: "تجنّب الشمس المباشرة بعد الجلسة بيومين، واستخدم واقي الشمس.",
    },
    {
      name: "حقن فيلر (شفايف/خدود)",
      price: "600 ₪",
      note: "يبدأ من — حسب الكمية",
      instructions: "تجنّب الضغط على المنطقة، والنتائج تظهر خلال 3–7 أيام.",
    },
    {
      name: "بوتوكس للتجاعيد",
      price: "500 ₪",
      note: "يبدأ من — حسب المنطقة",
      instructions: "تجنّب الاستلقاء والرياضة لمدة 4 ساعات بعد الحقن.",
    },
    {
      name: "ليزر إزالة الشعر",
      price: "100–250 ₪",
      note: "حسب حجم المنطقة",
      instructions: "تجنّب الشمس قبل وبعد الجلسة بيومين، ولا تنزع الشعر بالشمع قبلها.",
    },
    {
      name: "نضارة وترطيب (ميزوثيرابي)",
      price: "250 ₪",
      note: "للجلسة",
      instructions: "الحضور بدون مكياج، واشرب ماءً كافياً بعد الجلسة.",
    },
    {
      name: "علاج حب الشباب وآثاره",
      price: "700 ₪",
      note: "باقة 4 جلسات",
      instructions: "الالتزام بالجلسات المتتابعة للحصول على أفضل نتيجة.",
    },
  ],
  team: [
    {
      name: "د. سلمى العتيبي",
      title: "أخصائية جلدية وتجميل",
      services: "بوتوكس، فيلر، تنظيف بشرة عميق، ميزوثيرابي",
      schedule: "السبت – الثلاثاء: 9 صباحاً – 3 عصراً",
    },
    {
      name: "د. ريان الشهري",
      title: "أخصائي ليزر وعناية بالبشرة",
      services: "ليزر إزالة الشعر، تقشير كيميائي، علاج حب الشباب",
      schedule: "الأحد – الخميس: 2 عصراً – 8 مساءً",
    },
  ],
  working_hours: "السبت – الخميس: 9 صباحاً – 5 مساءً · الجمعة: إجازة",
  insurance: "لا نتعامل مع تأمين طبي حالياً — الدفع نقداً أو تحويل.",
  cancel_policy: "الرجاء الإلغاء قبل الموعد بـ 3 ساعات على الأقل.",
  late_policy: "التأخر أكثر من 15 دقيقة قد يؤجّل الموعد حسب الجدول.",
};

// Tolerates older saved forms (missing per-service instructions).
export function normalizeAiInfo(raw: unknown): AiInfoForm | null {
  if (!raw || typeof raw !== "object") return null;
  const f = raw as Partial<AiInfoForm>;
  if (!Array.isArray(f.services)) return null;
  return {
    services: f.services.map((s) => ({
      name: s?.name ?? "",
      price: s?.price ?? "",
      note: s?.note ?? "",
      instructions: s?.instructions ?? "",
    })),
    team: Array.isArray(f.team)
      ? f.team.map((d) => ({
          name: d?.name ?? "",
          title: d?.title ?? "",
          services: d?.services ?? "",
          schedule: d?.schedule ?? "",
        }))
      : [],
    working_hours: f.working_hours ?? "",
    insurance: f.insurance ?? "",
    cancel_policy: f.cancel_policy ?? "",
    late_policy: f.late_policy ?? "",
  };
}

export function assembleAiInfo(
  clinicName: string,
  doctor: string,
  f: AiInfoForm
): string {
  const lines: string[] = [];
  lines.push(`عيادة ${clinicName}${doctor ? " — د. " + doctor : ""}`);

  // Team / doctors. When the clinic lists a team, the AI presents these
  // practitioners and books with the one the patient picks; otherwise it
  // books with the single owner doctor above. The explicit "طريقة الحجز"
  // line tells the agent which mode it is in, deterministically.
  const team = f.team.filter((d) => d.name.trim());
  if (team.length) {
    lines.push("", "أطباء العيادة (اعرضهم على المريض ودعه يختار):");
    for (const d of team) {
      const title = d.title.trim() ? ` — ${d.title.trim()}` : "";
      lines.push(`• ${d.name.trim()}${title}`);
      if (d.services.trim()) lines.push(`   يقدّم: ${d.services.trim()}`);
      if (d.schedule.trim()) lines.push(`   مواعيده: ${d.schedule.trim()}`);
    }
    lines.push(
      "طريقة الحجز: العيادة فيها أكثر من طبيب — اعرض الأطباء وما يقدّمه كل واحد ومواعيده، واسأل المريض من يناسبه، ثم احجز معه."
    );
  } else {
    lines.push(
      "",
      `طريقة الحجز: العيادة فيها الطبيب${doctor ? " د. " + doctor : ""} فقط — احجز معه مباشرة دون الحاجة لسؤال المريض عن اختيار طبيب.`
    );
  }

  const services = f.services.filter((s) => s.name.trim());
  if (services.length) {
    lines.push("", "الخدمات والأسعار:");
    for (const s of services) {
      const price = s.price.trim() ? `: ${s.price.trim()}` : "";
      const note = s.note.trim() ? ` (${s.note.trim()})` : "";
      lines.push(`• ${s.name.trim()}${price}${note}`);
      if (s.instructions.trim()) {
        lines.push(`   تعليمات هذه الخدمة: ${s.instructions.trim()}`);
      }
    }
  }

  if (f.working_hours.trim()) lines.push("", "أوقات العمل:", f.working_hours.trim());
  if (f.insurance.trim()) lines.push("", "التأمين:", f.insurance.trim());

  const policy = [f.cancel_policy, f.late_policy].map((x) => x.trim()).filter(Boolean);
  if (policy.length) {
    lines.push("", "سياسة المواعيد:");
    for (const p of policy) lines.push(`• ${p}`);
  }

  return lines.join("\n");
}
