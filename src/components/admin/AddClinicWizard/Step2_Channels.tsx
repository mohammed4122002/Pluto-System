"use client";

import { useState } from "react";
import { ChevronDown, Copy, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Channel, ClinicChannel } from "@/types";
import type { StepProps } from "./types";

const CHANNELS: { channel: Channel; label: string }[] = [
  { channel: "whatsapp", label: "WhatsApp" },
  { channel: "telegram", label: "Telegram" },
  { channel: "messenger", label: "Facebook Messenger" },
  { channel: "instagram", label: "Instagram DM" },
];

export function Step2_Channels({ data, update }: StepProps) {
  const [testing, setTesting] = useState(false);
  const [testingTelegram, setTestingTelegram] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);

  const whatsapp = data.channels.find((c) => c.channel === "whatsapp");
  const telegram = data.channels.find((c) => c.channel === "telegram");
  const whatsappEnabled = Boolean(whatsapp);
  const noChannelSelected = data.channels.length === 0;

  function patchChannel(channel: Channel, patch: Partial<ClinicChannel>) {
    const exists = data.channels.some((c) => c.channel === channel);
    const next = exists
      ? data.channels.map((c) => (c.channel === channel ? { ...c, ...patch } : c))
      : [...data.channels, { channel, is_enabled: true, ...patch }];
    update({ channels: next });
  }

  function toggleChannel(channel: Channel, enabled: boolean) {
    if (enabled) {
      patchChannel(channel, { is_enabled: true });
    } else {
      update({ channels: data.channels.filter((c) => c.channel !== channel) });
    }
  }

  const verifyToken = whatsapp?.wa_verify_token ?? "";
  const webhookUrl = verifyToken
    ? `${process.env.NEXT_PUBLIC_N8N_WEBHOOK_BASE_URL ?? "https://[n8n-cloud-url]/webhook"}/${verifyToken}/whatsapp`
    : "";

  async function handleTestConnection() {
    if (!whatsapp?.wa_phone_id || !whatsapp?.wa_access_token) {
      toast.error("أدخل wa_phone_id و wa_access_token أولاً");
      return;
    }
    setTesting(true);
    try {
      const res = await fetch("/api/whatsapp/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wa_phone_id: whatsapp.wa_phone_id,
          wa_access_token: whatsapp.wa_access_token,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error ?? "فشل الاختبار");
      toast.success("تم إرسال رسالة اختبار بنجاح");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "فشل الاختبار");
    } finally {
      setTesting(false);
    }
  }

  async function handleTestTelegramConnection() {
    if (!telegram?.tg_bot_token) {
      toast.error("أدخل Bot Token أولاً");
      return;
    }
    setTestingTelegram(true);
    try {
      const res = await fetch("/api/telegram/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bot_token: telegram.tg_bot_token }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.debug ? `${json.error} | ${JSON.stringify(json.debug)}` : json.error ?? "فشل الاختبار");
      }
      toast.success(`رمز صالح ✅ البوت: @${json.bot.username}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "فشل الاختبار", { duration: 30000 });
    } finally {
      setTestingTelegram(false);
    }
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        فعّل قناة تواصل واحدة على الأقل. اختر أي مزيج يناسب عيادتك — لا حاجة
        لتفعيلها كلها.
      </p>

      {noChannelSelected ? (
        <div className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
          <AlertCircle className="size-4 shrink-0" />
          لازم تفعّل قناة تواصل واحدة على الأقل قبل المتابعة.
        </div>
      ) : null}

      {CHANNELS.map(({ channel, label }) => {
        const enabled = data.channels.some((c) => c.channel === channel);
        return (
          <Card key={channel}>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">{label}</CardTitle>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => toggleChannel(channel, e.target.checked)}
                />
                تفعيل
              </label>
            </CardHeader>
            {enabled ? (
              <CardContent className="space-y-4">
                {channel === "whatsapp" ? (
                  <>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>رقم الواتساب</Label>
                        <Input
                          dir="ltr"
                          value={whatsapp?.wa_phone_number ?? ""}
                          onChange={(e) =>
                            patchChannel("whatsapp", { wa_phone_number: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Phone Number ID</Label>
                        <Input
                          dir="ltr"
                          value={whatsapp?.wa_phone_id ?? ""}
                          onChange={(e) =>
                            patchChannel("whatsapp", { wa_phone_id: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>WhatsApp Business Account ID</Label>
                        <Input
                          dir="ltr"
                          value={whatsapp?.wa_waba_id ?? ""}
                          onChange={(e) =>
                            patchChannel("whatsapp", { wa_waba_id: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>System User Token</Label>
                        <Input
                          dir="ltr"
                          type="password"
                          value={whatsapp?.wa_access_token ?? ""}
                          onChange={(e) =>
                            patchChannel("whatsapp", { wa_access_token: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label>Verify Token</Label>
                        <div className="flex gap-2">
                          <Input dir="ltr" readOnly value={verifyToken} />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() =>
                              patchChannel("whatsapp", { wa_verify_token: crypto.randomUUID() })
                            }
                          >
                            توليد
                          </Button>
                        </div>
                      </div>
                      {webhookUrl ? (
                        <div className="space-y-2 sm:col-span-2">
                          <Label>Webhook URL</Label>
                          <div className="flex gap-2">
                            <Input dir="ltr" readOnly value={webhookUrl} />
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => {
                                navigator.clipboard.writeText(webhookUrl);
                                toast.success("تم النسخ");
                              }}
                            >
                              <Copy className="size-4" />
                            </Button>
                          </div>
                        </div>
                      ) : null}
                    </div>

                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleTestConnection}
                      disabled={testing}
                    >
                      {testing ? <Loader2 className="size-4 animate-spin" /> : null}
                      اختبار الاتصال
                    </Button>

                    <button
                      type="button"
                      onClick={() => setGuideOpen((o) => !o)}
                      className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                    >
                      <ChevronDown
                        className={`size-4 transition-transform ${guideOpen ? "rotate-180" : ""}`}
                      />
                      4 خطوات لإعداد واتساب في Meta
                    </button>
                    {guideOpen ? (
                      <ol className="list-inside list-decimal space-y-1 rounded-md bg-muted p-4 text-sm text-muted-foreground">
                        <li>أنشئ تطبيق WhatsApp Business في Meta Developer Console</li>
                        <li>فعّل رقم هاتف واحصل على Phone Number ID و WABA ID</li>
                        <li>أنشئ System User وولّد Permanent Access Token</li>
                        <li>سجّل Webhook URL أعلاه مع Verify Token في إعدادات التطبيق</li>
                      </ol>
                    ) : null}
                  </>
                ) : channel === "telegram" ? (
                  <div className="space-y-2">
                    <Label>Bot Token</Label>
                    <Input
                      dir="ltr"
                      value={telegram?.tg_bot_token ?? ""}
                      onChange={(e) => patchChannel(channel, { tg_bot_token: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      من BotFather. لا حاجة لأي معرّف محادثة (Chat ID) — كل مريض يُربط
                      تلقائياً بمحادثته بعد إرسال /start ومشاركة رقم هاتفه للبوت.
                    </p>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleTestTelegramConnection}
                      disabled={testingTelegram}
                    >
                      {testingTelegram ? <Loader2 className="size-4 animate-spin" /> : null}
                      اختبار الاتصال
                    </Button>
                  </div>
                ) : channel === "messenger" ? (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Page ID</Label>
                      <Input
                        dir="ltr"
                        onChange={(e) => patchChannel(channel, { fb_page_id: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Page Token</Label>
                      <Input
                        dir="ltr"
                        onChange={(e) => patchChannel(channel, { fb_page_token: e.target.value })}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Account ID</Label>
                      <Input
                        dir="ltr"
                        onChange={(e) => patchChannel(channel, { ig_account_id: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Access Token</Label>
                      <Input
                        dir="ltr"
                        onChange={(e) => patchChannel(channel, { ig_access_token: e.target.value })}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            ) : null}
          </Card>
        );
      })}

      {!whatsappEnabled && data.channels.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          ملاحظة: في هذه المرحلة (MVP) الأتمتة الفعلية (التذكيرات والتقييمات)
          تُرسل عبر واتساب فقط — القنوات الأخرى تُحفظ في الإعدادات وتُفعَّل
          لاحقاً.
        </p>
      ) : null}
    </div>
  );
}
