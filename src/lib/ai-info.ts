// Structured "AI receptionist info" builder. The manager fills organized
// fields in a modal; this assembles them into the plain, readable Arabic
// string the AI agent actually reads (clinics.ai_info_text). The structured
// form itself is persisted separately (clinics.ai_info_form) so it can be
// reopened and edited.

export interface AiInfoService {
  name: string;
  price: string;
  note: string;
}

export interface AiInfoForm {
  services: AiInfoService[];
  working_hours: string;
  insurance: string;
  prep: string;
  sun: string;
  results: string;
  cancel_policy: string;
  late_policy: string;
}

export const EMPTY_AI_INFO: AiInfoForm = {
  services: [{ name: "", price: "", note: "" }],
  working_hours: "",
  insurance: "",
  prep: "",
  sun: "",
  results: "",
  cancel_policy: "",
  late_policy: "",
};

// Sensible starter content for a cosmetic clinic — used when a clinic has no
// saved structured info yet. All fields are editable.
export const SAMPLE_AI_INFO: AiInfoForm = {
  services: [
    { name: "استشارة أولى", price: "50 ₪", note: "تُخصم من قيمة أول جلسة" },
    { name: "تنظيف بشرة عميق", price: "120 ₪", note: "" },
    { name: "تقشير كيميائي", price: "200 ₪", note: "للجلسة" },
    { name: "حقن فيلر (شفايف/خدود)", price: "600 ₪", note: "يبدأ من — حسب الكمية" },
    { name: "بوتوكس للتجاعيد", price: "500 ₪", note: "يبدأ من — حسب المنطقة" },
    { name: "ليزر إزالة الشعر", price: "100–250 ₪", note: "حسب حجم المنطقة" },
    { name: "نضارة وترطيب (ميزوثيرابي)", price: "250 ₪", note: "للجلسة" },
    { name: "علاج حب الشباب وآثاره", price: "700 ₪", note: "باقة 4 جلسات" },
  ],
  working_hours: "السبت – الخميس: 9 صباحاً – 5 مساءً · الجمعة: إجازة",
  insurance: "لا نتعامل مع تأمين طبي حالياً — الدفع نقداً أو تحويل.",
  prep: "يُفضّل الحضور بدون مكياج قبل جلسات البشرة والليزر.",
  sun: "تجنّب الشمس المباشرة قبل وبعد جلسة الليزر بيومين.",
  results: "نتائج الفيلر والبوتوكس تظهر خلال 3–7 أيام.",
  cancel_policy: "الرجاء الإلغاء قبل الموعد بـ 3 ساعات على الأقل.",
  late_policy: "التأخر أكثر من 15 دقيقة قد يؤجّل الموعد حسب الجدول.",
};

export function assembleAiInfo(
  clinicName: string,
  doctor: string,
  f: AiInfoForm
): string {
  const lines: string[] = [];
  lines.push(`عيادة ${clinicName}${doctor ? " — د. " + doctor : ""}`);

  const services = f.services.filter((s) => s.name.trim());
  if (services.length) {
    lines.push("", "الخدمات والأسعار:");
    for (const s of services) {
      const price = s.price.trim() ? `: ${s.price.trim()}` : "";
      const note = s.note.trim() ? ` (${s.note.trim()})` : "";
      lines.push(`• ${s.name.trim()}${price}${note}`);
    }
  }

  if (f.working_hours.trim()) lines.push("", "أوقات العمل:", f.working_hours.trim());
  if (f.insurance.trim()) lines.push("", "التأمين:", f.insurance.trim());

  const patient = [f.prep, f.sun, f.results].map((x) => x.trim()).filter(Boolean);
  if (patient.length) {
    lines.push("", "تعليمات المرضى:");
    for (const p of patient) lines.push(`• ${p}`);
  }

  const policy = [f.cancel_policy, f.late_policy].map((x) => x.trim()).filter(Boolean);
  if (policy.length) {
    lines.push("", "سياسة المواعيد:");
    for (const p of policy) lines.push(`• ${p}`);
  }

  return lines.join("\n");
}
