"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface ChannelSummary {
  channel: "telegram" | "whatsapp";
  is_enabled: boolean;
  configured: boolean;
  wa_provider?: "meta" | "twilio" | null;
  wa_phone_number?: string | null;
  wa_phone_id?: string | null;
  wa_waba_id?: string | null;
  twilio_account_sid?: string | null;
  twilio_whatsapp_from?: string | null;
}

export function ChannelsEditor({
  clinicId,
  initial,
}: {
  clinicId: string;
  initial: ChannelSummary[];
}) {
  const router = useRouter();
  const telegram = initial.find((c) => c.channel === "telegram");
  const whatsapp = initial.find((c) => c.channel === "whatsapp");

  return (
    <div className="space-y-6">
      <TelegramSection clinicId={clinicId} current={telegram} onSaved={() => router.refresh()} />
      <div className="border-t border-border/60 pt-6">
        <WhatsAppSection clinicId={clinicId} current={whatsapp} onSaved={() => router.refresh()} />
      </div>
    </div>
  );
}

function TelegramSection({
  clinicId,
  current,
  onSaved,
}: {
  clinicId: string;
  current?: ChannelSummary;
  onSaved: () => void;
}) {
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!token.trim()) {
      toast.error("أدخل Bot Token أولاً");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/clinic/${clinicId}/channels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: "telegram", tg_bot_token: token.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "فشل الحفظ");
      if (json.warnings?.length) {
        toast.warning(`تم الحفظ لكن تعذّر ربط الـwebhook تلقائياً: ${json.warnings[0]}`);
      } else {
        toast.success("تم حفظ تيليجرام وربطه تلقائياً ✅ جرّب مراسلة البوت الآن");
      }
      setToken("");
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل الحفظ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <p className="font-medium">تيليجرام</p>
        {current?.configured ? (
          <Badge className="gap-1 bg-success/15 text-success text-[11px]">
            <CheckCircle2 className="size-3" /> مُعدّ
          </Badge>
        ) : (
          <Badge variant="secondary" className="text-[11px]">
            غير مُعدّ
          </Badge>
        )}
      </div>
      <div className="space-y-2">
        <Label>Bot Token</Label>
        <Input
          dir="ltr"
          placeholder={current?.configured ? "أدخِله من جديد لتأكيد الحفظ" : "من BotFather"}
          value={token}
          onChange={(e) => setToken(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          يُسجَّل الـwebhook تلقائياً عند الحفظ — البوت يبدأ بالرد فوراً.
        </p>
      </div>
      <Button type="button" size="sm" onClick={save} disabled={busy}>
        {busy ? <Loader2 className="size-4 animate-spin" /> : null}
        حفظ وربط تلقائياً
      </Button>
    </div>
  );
}

function WhatsAppSection({
  clinicId,
  current,
  onSaved,
}: {
  clinicId: string;
  current?: ChannelSummary;
  onSaved: () => void;
}) {
  const [provider, setProvider] = useState<"meta" | "twilio">(current?.wa_provider ?? "twilio");
  const [waPhoneNumber, setWaPhoneNumber] = useState(current?.wa_phone_number ?? "");
  const [waPhoneId, setWaPhoneId] = useState(current?.wa_phone_id ?? "");
  const [waWabaId, setWaWabaId] = useState(current?.wa_waba_id ?? "");
  const [waAccessToken, setWaAccessToken] = useState("");
  const [twilioSid, setTwilioSid] = useState(current?.twilio_account_sid ?? "");
  const [twilioToken, setTwilioToken] = useState("");
  const [twilioFrom, setTwilioFrom] = useState(current?.twilio_whatsapp_from ?? "");
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      const body =
        provider === "twilio"
          ? {
              channel: "whatsapp",
              wa_provider: "twilio",
              twilio_account_sid: twilioSid.trim(),
              twilio_auth_token: twilioToken.trim(),
              twilio_whatsapp_from: twilioFrom.trim(),
            }
          : {
              channel: "whatsapp",
              wa_provider: "meta",
              wa_phone_number: waPhoneNumber.trim(),
              wa_phone_id: waPhoneId.trim(),
              wa_waba_id: waWabaId.trim(),
              wa_access_token: waAccessToken.trim(),
            };
      const res = await fetch(`/api/clinic/${clinicId}/channels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "فشل الحفظ");
      if (json.warnings?.length) {
        toast.warning(`تم الحفظ لكن: ${json.warnings[0]}`);
      } else {
        toast.success("تم حفظ واتساب ✅");
      }
      setWaAccessToken("");
      setTwilioToken("");
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل الحفظ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <p className="font-medium">واتساب</p>
        {current?.configured ? (
          <Badge className="gap-1 bg-success/15 text-success text-[11px]">
            <CheckCircle2 className="size-3" /> مُعدّ ({current.wa_provider === "twilio" ? "Twilio" : "Meta"})
          </Badge>
        ) : (
          <Badge variant="secondary" className="text-[11px]">
            غير مُعدّ
          </Badge>
        )}
      </div>

      <div className="space-y-2">
        <Label>مزوّد خدمة الواتساب</Label>
        <select
          value={provider}
          onChange={(e) => setProvider(e.target.value as "meta" | "twilio")}
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="twilio">Twilio — أسهل (Sandbox جاهز)</option>
          <option value="meta">Meta — WhatsApp Cloud API (رسمي)</option>
        </select>
      </div>

      {provider === "twilio" ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Account SID</Label>
            <Input
              dir="ltr"
              placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              value={twilioSid}
              onChange={(e) => setTwilioSid(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Auth Token</Label>
            <Input
              dir="ltr"
              type="password"
              placeholder={current?.configured ? "أدخِله من جديد لتأكيد الحفظ" : ""}
              value={twilioToken}
              onChange={(e) => setTwilioToken(e.target.value)}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>رقم واتساب Twilio (المرسِل)</Label>
            <Input
              dir="ltr"
              placeholder="+14155238886"
              value={twilioFrom}
              onChange={(e) => setTwilioFrom(e.target.value)}
            />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>رقم الواتساب</Label>
            <Input
              dir="ltr"
              value={waPhoneNumber}
              onChange={(e) => setWaPhoneNumber(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Phone Number ID</Label>
            <Input dir="ltr" value={waPhoneId} onChange={(e) => setWaPhoneId(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>WhatsApp Business Account ID</Label>
            <Input dir="ltr" value={waWabaId} onChange={(e) => setWaWabaId(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>System User Token</Label>
            <Input
              dir="ltr"
              type="password"
              placeholder={current?.configured ? "أدخِله من جديد لتأكيد الحفظ" : ""}
              value={waAccessToken}
              onChange={(e) => setWaAccessToken(e.target.value)}
            />
          </div>
        </div>
      )}

      <Button type="button" size="sm" onClick={save} disabled={busy}>
        {busy ? <Loader2 className="size-4 animate-spin" /> : null}
        حفظ وربط تلقائياً
      </Button>
    </div>
  );
}
