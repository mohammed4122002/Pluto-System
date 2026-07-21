import { CalendarCheck, MapPin, MessageCircle, Phone, Stethoscope } from "lucide-react";

import { Badge } from "@/components/ui/badge";

// lucide-react dropped the Instagram/Facebook brand marks; small inline SVGs
// keep them recognizable without an extra icon dependency.
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
  whatsapp: string | null; // digits only, when a WhatsApp bot number exists
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
    <div className="flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-brand-sm transition-shadow hover:shadow-md">
      <div className="flex items-start gap-3 p-4">
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
          <h3 className="truncate text-base font-bold">{clinic.name}</h3>
          <p className="truncate text-sm text-muted-foreground">{clinic.doctor_name}</p>
          {clinic.specialty ? (
            <Badge className="mt-1 gap-1 bg-primary/10 text-primary">
              <Stethoscope className="size-3" />
              {clinic.specialty}
            </Badge>
          ) : null}
        </div>
      </div>

      {(clinic.city || clinic.address) && (
        <div className="flex items-start gap-1.5 px-4 pb-3 text-xs text-muted-foreground">
          <MapPin className="mt-0.5 size-3.5 shrink-0" />
          <span className="line-clamp-2">
            {[clinic.address, clinic.city, clinic.country].filter(Boolean).join("، ")}
          </span>
        </div>
      )}

      <div className="mt-auto flex items-center gap-2 border-t border-border/60 p-3">
        <div className="flex items-center gap-1.5">
          {clinic.instagram_url ? (
            <a
              href={clinic.instagram_url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="إنستغرام"
              className="flex size-9 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-pink-500/15 hover:text-pink-600"
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
              className="flex size-9 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-blue-500/15 hover:text-blue-600"
            >
              <FacebookIcon className="size-4" />
            </a>
          ) : null}
          {clinic.phone ? (
            <a
              href={`tel:${clinic.phone}`}
              aria-label="اتصال"
              className="flex size-9 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-emerald-500/15 hover:text-emerald-600"
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
            className="ms-auto inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            {waNumber ? <MessageCircle className="size-4" /> : <Phone className="size-4" />}
            احجز الآن
          </a>
        ) : (
          <span className="ms-auto inline-flex items-center gap-1.5 rounded-full bg-muted px-4 py-2 text-sm text-muted-foreground">
            <CalendarCheck className="size-4" />
            قريباً
          </span>
        )}
      </div>
    </div>
  );
}
