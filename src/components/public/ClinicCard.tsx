import { Clock, MapPin, MessageCircle, Phone, Stethoscope } from "lucide-react";

import { Badge } from "@/components/ui/badge";

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12Z" />
    </svg>
  );
}

export type PublicClinic = {
  id: string;
  name: string;
  doctor_name: string;
  specialty: string | null;
  city: string | null;
  country: string | null;
  address: string | null;
  phone: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  logo_url: string | null;
  whatsapp: string | null;
  working_hours_start?: string | null;
  working_hours_end?: string | null;
};

const digits = (s: string | null) => (s ? s.replace(/\D/g, "") : "");

export function ClinicCard({ clinic }: { clinic: PublicClinic }) {
  const waNumber = clinic.whatsapp || digits(clinic.phone);
  const bookHref = waNumber
    ? `https://wa.me/${waNumber}?text=${encodeURIComponent("مرحباً، أريد حجز موعد 🌿")}`
    : clinic.phone
      ? `tel:${clinic.phone}`
      : null;

  const initials = clinic.name.trim().slice(0, 2);

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-brand-sm transition-all hover:shadow-lg hover:border-primary/30">
      {/* رأس البطاقة - الاسم والطبيب والتخصص */}
      <div className="flex items-start gap-3 p-4 pb-3">
        {clinic.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={clinic.logo_url}
            alt={clinic.name}
            className="size-14 shrink-0 rounded-xl border border-border object-cover"
          />
        ) : (
          <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-lg font-bold text-primary">
            {initials}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-bold leading-tight">{clinic.name}</h3>
          <p className="text-sm text-muted-foreground">{clinic.doctor_name}</p>
          {clinic.specialty ? (
            <Badge className="mt-1.5 gap-1 bg-primary/10 text-primary hover:bg-primary/20">
              <Stethoscope className="size-3" />
              {clinic.specialty}
            </Badge>
          ) : null}
        </div>
      </div>

      {/* الموقع */}
      {(clinic.city || clinic.address) && (
        <div className="flex items-start gap-2 px-4 py-2 text-sm">
          <MapPin className="mt-0.5 size-4 shrink-0 text-primary/60" />
          <div className="min-w-0 flex-1">
            {clinic.address && <div className="text-foreground font-medium truncate">{clinic.address}</div>}
            {(clinic.city || clinic.country) && (
              <div className="text-xs text-muted-foreground">
                {[clinic.city, clinic.country].filter(Boolean).join("، ")}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ساعات العمل */}
      {(clinic.working_hours_start || clinic.working_hours_end) && (
        <div className="flex items-center gap-2 px-4 py-2 text-sm">
          <Clock className="size-4 shrink-0 text-primary/60" />
          <span className="text-foreground">
            من {clinic.working_hours_start || "—"} إلى {clinic.working_hours_end || "—"}
          </span>
        </div>
      )}

      {/* وسائل التواصل والزر */}
      <div className="mt-auto flex items-center gap-2 border-t border-border/60 p-3">
        <div className="flex items-center gap-1">
          {clinic.instagram_url ? (
            <a
              href={clinic.instagram_url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="إنستغرام"
              className="flex size-8 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-pink-500/15 hover:text-pink-600"
            >
              <InstagramIcon className="size-4" />
            </a>
          ) : null}
          {clinic.facebook_url ? (
            <a
              href={clinic.facebook_url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="فيسبوك"
              className="flex size-8 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-blue-500/15 hover:text-blue-600"
            >
              <FacebookIcon className="size-4" />
            </a>
          ) : null}
          {clinic.phone ? (
            <a
              href={`tel:${clinic.phone}`}
              aria-label="اتصال"
              className="flex size-8 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-emerald-500/15 hover:text-emerald-600"
            >
              <Phone className="size-4" />
            </a>
          ) : null}
        </div>

        {bookHref ? (
          <a
            href={bookHref}
            target={waNumber ? "_blank" : undefined}
            rel="noopener noreferrer"
            className="ms-auto inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground transition-all hover:shadow-md hover:opacity-90 active:scale-95"
          >
            {waNumber ? <MessageCircle className="size-4" /> : <Phone className="size-4" />}
            احجز
          </a>
        ) : (
          <span className="ms-auto inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs text-muted-foreground">
            قريباً
          </span>
        )}
      </div>
    </div>
  );
}
