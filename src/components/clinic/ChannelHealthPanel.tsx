"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, Loader2, RefreshCw, MessageCircle, Link2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface HealthResult {
  channel: string;
  provider?: string;
  ok: boolean;
  label?: string;
  error?: string;
  webhook?: {
    registered: boolean;
    matches: boolean;
    pendingUpdates: number;
    lastError: string | null;
  };
}

const CHANNEL_LABEL: Record<string, string> = {
  telegram: "تيليجرام",
  whatsapp: "واتساب",
};

export function ChannelHealthPanel({ clinicId }: { clinicId: string }) {
  const [loading, setLoading] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [results, setResults] = useState<HealthResult[] | null>(null);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);

  async function reconnectBot() {
    setReconnecting(true);
    try {
      const res = await fetch(`/api/clinic/${clinicId}/register-webhook`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "تعذّر ربط البوت");
      toast.success("تم ربط البوت — سيبدأ بالرد على الرسائل الآن ✅");
      await runCheck();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذّر ربط البوت");
    } finally {
      setReconnecting(false);
    }
  }

  async function runCheck() {
    setLoading(true);
    try {
      const res = await fetch(`/api/clinic/${clinicId}/channel-health`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "فشل الفحص");
      setResults(json.results ?? []);
      setCheckedAt(json.checkedAt ?? new Date().toISOString());
      const bad = (json.results ?? []).filter((r: HealthResult) => !r.ok).length;
      if ((json.results ?? []).length === 0) {
        toast.info("لا توجد قنوات مُعدّة للفحص");
      } else if (bad === 0) {
        toast.success("كل القنوات سليمة ✅");
      } else {
        toast.warning(`${bad} قناة تحتاج انتباه`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "فشل الفحص");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          افحص القنوات مباشرةً — يكشف إن كان توكن البوت سليماً، وإن كان بوت تيليجرام
          مربوطاً فعلاً باستقبال الرسائل. إن ظهر «يحتاج إصلاح» لتيليجرام اضغط «إعادة ربط
          البوت» لتفعيل الردود فوراً.
        </p>
        <Button type="button" onClick={runCheck} disabled={loading} size="sm">
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <RefreshCw className="size-4" />
          )}
          فحص القنوات الآن
        </Button>
      </div>

      {results === null ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border/70 py-8 text-center text-sm text-muted-foreground">
          <MessageCircle className="size-6 opacity-60" />
          اضغط «فحص القنوات الآن» لعرض حالة الاتصال.
        </div>
      ) : results.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/70 py-8 text-center text-sm text-muted-foreground">
          لا توجد قنوات مُعدّة بعد — أضِف قناة من صفحة العيادة في لوحة الإدارة.
        </div>
      ) : (
        <div className="space-y-3">
          {results.map((r, i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-3 rounded-lg border border-border px-4 py-3"
            >
              <div className="flex items-center gap-3">
                {r.ok ? (
                  <CheckCircle2 className="size-5 shrink-0 text-success" />
                ) : (
                  <XCircle className="size-5 shrink-0 text-destructive" />
                )}
                <div>
                  <p className="text-sm font-medium">
                    {CHANNEL_LABEL[r.channel] ?? r.channel}
                    {r.provider === "twilio" ? " (Twilio)" : ""}
                    {r.provider === "meta" ? " (Meta)" : ""}
                  </p>
                  {r.ok ? (
                    <p className="text-xs text-muted-foreground" dir="ltr">
                      {r.label}
                    </p>
                  ) : (
                    <p className="text-xs text-destructive">{r.error}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {r.channel === "telegram" && !r.ok ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={reconnectBot}
                    disabled={reconnecting}
                  >
                    {reconnecting ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Link2 className="size-4" />
                    )}
                    إعادة ربط البوت
                  </Button>
                ) : null}
                <Badge
                  className={
                    r.ok
                      ? "bg-success/15 text-success"
                      : "bg-destructive/15 text-destructive"
                  }
                >
                  {r.ok ? "سليم" : "يحتاج إصلاح"}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}

      {checkedAt ? (
        <p className="text-xs text-muted-foreground">
          آخر فحص:{" "}
          <span dir="ltr">
            {new Intl.DateTimeFormat("ar-SA", {
              hour: "2-digit",
              minute: "2-digit",
              day: "numeric",
              month: "short",
              timeZone: "Asia/Riyadh",
            }).format(new Date(checkedAt))}
          </span>
        </p>
      ) : null}
    </div>
  );
}
