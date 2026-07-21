import { AlertTriangle, Ban } from "lucide-react";

import { formatDateAr } from "@/lib/format";

// Server-rendered banner shown at the top of every clinic page when the
// subscription is expiring soon (amber) or the clinic is suspended for a
// lapsed subscription (red). Renewal is handled by the platform owner, so
// the copy points the clinic there.
export function SubscriptionBanner({
  clinicStatus,
  suspendedReason,
  expiresAt,
}: {
  clinicStatus: string;
  suspendedReason: string | null;
  expiresAt: string | null;
}) {
  if (clinicStatus === "suspended" && suspendedReason === "subscription_expired") {
    return (
      <div className="mb-4 flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        <Ban className="mt-0.5 size-4 shrink-0" />
        <div>
          <p className="font-semibold">انتهى اشتراك العيادة — الخدمة موقوفة</p>
          <p className="mt-0.5 text-destructive/80">
            البوت والحجوزات متوقفة تلقائياً. تواصل مع إدارة المنصة لتجديد
            الاشتراك، وستعود الخدمة للعمل فور التجديد.
          </p>
        </div>
      </div>
    );
  }

  if (!expiresAt) return null;

  // Server component rendered once per request — the clock read is stable for
  // the lifetime of this render (same false-positive class as the inbox poll).
  // eslint-disable-next-line react-hooks/purity
  const msLeft = new Date(`${expiresAt}T23:59:59+03:00`).getTime() - Date.now();
  const daysLeft = Math.ceil(msLeft / 86_400_000);
  if (daysLeft < 0 || daysLeft > 7) return null;

  return (
    <div className="mb-4 flex items-start gap-3 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
      <div>
        <p className="font-semibold">
          اشتراك العيادة ينتهي {daysLeft <= 1 ? "خلال يوم" : `خلال ${daysLeft} أيام`}
          {" "}({formatDateAr(expiresAt)})
        </p>
        <p className="mt-0.5 opacity-80">
          جدّد عبر إدارة المنصة قبل الانتهاء لتجنّب توقف البوت والحجوزات تلقائياً.
        </p>
      </div>
    </div>
  );
}
