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
  const [testTo, setTestTo] = useState("");

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

  const waProvider = whatsapp?.wa_provider ?? "meta";
  const verifyToken = whatsapp?.wa_verify_token ?? "";
  const n8nBase =
    process.env.NEXT_PUBLIC_N8N_WEBHOOK_BASE_URL ?? "https://[n8n-cloud-url]/webhook";
  const webhookUrl = verifyToken ? `${n8nBase}/${verifyToken}/whatsapp` : "";
  // One shared inbound URL for every Twilio clinic — the n8n workflow matches
  // the clinic by the Twilio "To" number, so the owner pastes this same URL
  // into each Twilio WhatsApp number's inbound webhook.
  const twilioWebhookUrl = `${n8nBase}/d9e8f7a6-twilio-whatsapp`;

  async function handleTestConnection() {
    const isTwilio = waProvider === "twilio";
    if (isTwilio) {
      if (!whatsapp?.twilio_account_sid || !whatsapp?.twilio_auth_token) {
        toast.error("أدخل Account SID و Auth Token أولاً");
        return;
      }
    } else if (!whatsapp?.wa_phone_id || !whatsapp?.wa_access_token) {
      toast.error("أدخل Phone Number ID و Access Token أولاً");
      return;
    }
    setTesting(true);
    try {
      const res = await fetch("/api/whatsapp/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: waProvider,
          wa_phone_id: whatsapp?.wa_phone_id,
          wa_access_token: whatsapp?.wa_access_token,
          twilio_account_sid: whatsapp?.twilio_account_sid,
          twilio_auth_token: whatsapp?.twilio_auth_token,
          twilio_whatsapp_from: whatsapp?.twilio_whatsapp_from,
          to: testTo || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error ?? "فشل الاختبار");

      const name = json.verified_name || json.display_phone_number || "";
      toast.success(
        name ? `البيانات صحيحة ✅ الرقم: ${name}` : "البيانات صحيحة ✅"
      );
      if (testTo) {
        if (json.messageSent) {
          toast.success("تم إرسال رسالة اختبار للرقم المُدخل ✅");
        } else if (json.messageNote) {
          toast.warning(`لم تُرسل رسالة الاختبار: ${json.messageNote}`, {
            description:
              "البيانات صحيحة، لكن واتساب لا يسمح برسالة نصية حرة إلا داخل 24 ساعة من مراسلة العميل أو عبر قالب معتمد.",
          });
        }
      }
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
      if (!res.ok || !json.ok) throw new Error(json.error ?? "فشل الاختبار");
      toast.success(`رمز صالح ✅ البوت: @${json.bot.username}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "فشل الاختبار");
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
                    <div className="space-y-2">
                      <Label>مزوّد خدمة الواتساب</Label>
                      <select
                        value={waProvider}
                        onChange={(e) =>
                          patchChannel("whatsapp", {
                            wa_provider: e.target.value as "meta" | "twilio",
                          })
                        }
                        className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <option value="meta">Meta — WhatsApp Cloud API (رسمي)</option>
                        <option value="twilio">Twilio — أسهل (Sandbox جاهز، بدون توثيق بزنس)</option>
                      </select>
                      <p className="text-xs text-muted-foreground">
                        اختر المزوّد الذي يناسبك — كلاهما يشغّل نفس البوت الذكي والحجز. Twilio
                        أسرع في البداية، وMeta رسمي مباشر من واتساب.
                      </p>
                    </div>

                    {waProvider === "meta" ? (
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
                    ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Account SID</Label>
                        <Input
                          dir="ltr"
                          placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                          value={whatsapp?.twilio_account_sid ?? ""}
                          onChange={(e) =>
                            patchChannel("whatsapp", { twilio_account_sid: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Auth Token</Label>
                        <Input
                          dir="ltr"
                          type="password"
                          value={whatsapp?.twilio_auth_token ?? ""}
                          onChange={(e) =>
                            patchChannel("whatsapp", { twilio_auth_token: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label>رقم واتساب Twilio (المرسِل)</Label>
                        <Input
                          dir="ltr"
                          placeholder="+14155238886"
                          value={whatsapp?.twilio_whatsapp_from ?? ""}
                          onChange={(e) =>
                            patchChannel("whatsapp", { twilio_whatsapp_from: e.target.value })
                          }
                        />
                        <p className="text-xs text-muted-foreground">
                          رقم واتساب من Twilio بصيغة دولية (أو رقم الـ Sandbox). يُضاف تلقائياً بادئة
                          <span dir="ltr"> whatsapp: </span> عند الإرسال.
                        </p>
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label>Inbound Webhook URL (الصقه في Twilio)</Label>
                        <div className="flex gap-2">
                          <Input dir="ltr" readOnly value={twilioWebhookUrl} />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              navigator.clipboard.writeText(twilioWebhookUrl);
                              toast.success("تم النسخ");
                            }}
                          >
                            <Copy className="size-4" />
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          في Twilio Console → WhatsApp Sandbox/Sender → خانة «When a message comes
                          in»، الصق هذا الرابط (طريقة POST). نفس الرابط لكل العيادات.
                        </p>
                      </div>
                    </div>
                    )}

                    <div className="space-y-2 rounded-lg border border-border/60 bg-muted/30 p-3">
                      <Label className="text-xs">
                        رقم لإرسال رسالة اختبار إليه (اختياري — بصيغة دولية مثل 9665xxxxxxxx)
                      </Label>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Input
                          dir="ltr"
                          placeholder="9665xxxxxxxx"
                          value={testTo}
                          onChange={(e) => setTestTo(e.target.value)}
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={handleTestConnection}
                          disabled={testing}
                        >
                          {testing ? <Loader2 className="size-4 animate-spin" /> : null}
                          اختبار الاتصال
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {waProvider === "twilio"
                          ? "الاختبار يتحقق من صحة Account SID و Auth Token من Twilio. إرسال رسالة فعلية يحتاج رقم المرسِل ومتلقٍّ مُفعّل في الـ Sandbox أو رقماً معتمداً."
                          : "الاختبار يتحقق من صحة الـ Token و Phone ID مباشرة من Meta. إرسال رسالة فعلية يعمل فقط إذا راسلك الرقم خلال آخر 24 ساعة أو عبر قالب معتمد."}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setGuideOpen((o) => !o)}
                      className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                    >
                      <ChevronDown
                        className={`size-4 transition-transform ${guideOpen ? "rotate-180" : ""}`}
                      />
                      {waProvider === "twilio"
                        ? "خطوات إعداد واتساب عبر Twilio"
                        : "4 خطوات لإعداد واتساب في Meta"}
                    </button>
                    {guideOpen ? (
                      waProvider === "twilio" ? (
                        <div className="space-y-3 rounded-md bg-muted p-4 text-sm text-muted-foreground">
                          <ol className="list-inside list-decimal space-y-1">
                            <li>أنشئ حساباً في twilio.com واحصل على Account SID و Auth Token من لوحة التحكم</li>
                            <li>فعّل WhatsApp: Messaging → Try it out → WhatsApp Sandbox (للتجربة فوراً) أو اطلب رقم واتساب مُعتمد للإنتاج</li>
                            <li>ضع رقم المرسِل (Sandbox أو رقمك) في خانة «رقم واتساب Twilio» أعلاه</li>
                            <li>
                              الصق <span className="font-medium text-foreground">Inbound Webhook URL</span> أعلاه في
                              خانة «When a message comes in» (POST) داخل إعداد الـ Sandbox/Sender
                            </li>
                          </ol>
                          <p className="rounded-md bg-emerald-500/10 p-2 text-emerald-700 dark:text-emerald-400">
                            ✅ لا يحتاج توثيق بزنس للتجربة، والتوكن لا ينتهي. جرّب فوراً بإرسال كلمة
                            التفعيل للـ Sandbox من واتساب.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3 rounded-md bg-muted p-4 text-sm text-muted-foreground">
                          <ol className="list-inside list-decimal space-y-1">
                            <li>أنشئ تطبيق WhatsApp Business في Meta Developer Console</li>
                            <li>فعّل رقم هاتف واحصل على Phone Number ID و WABA ID</li>
                            <li>أنشئ System User وولّد Permanent Access Token</li>
                            <li>
                              <span className="font-medium text-foreground">مرة واحدة فقط</span>{" "}
                              على مستوى التطبيق: سجّل Webhook URL أعلاه مع Verify Token في
                              Meta → WhatsApp → Configuration، واشترك في حقل{" "}
                              <span dir="ltr">messages</span>
                            </li>
                          </ol>
                          <p className="rounded-md bg-emerald-500/10 p-2 text-emerald-700 dark:text-emerald-400">
                            ✅ ربط رقم العيادة بالتطبيق يتم <b>تلقائياً</b> عند حفظ العيادة —
                            ما عاد تحتاج تربط كل عيادة يدوياً. تسجيل الـ Webhook (الخطوة ٤)
                            مرة واحدة للمنصة كلها ويكفي لجميع العيادات.
                          </p>
                        </div>
                      )
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
