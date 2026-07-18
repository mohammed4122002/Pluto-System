// Every clinic and patient in this system is in Saudi/Gulf time. Formatting
// appointment/reminder timestamps without an explicit timeZone renders in
// the RUNTIME's zone — the visitor's browser in a client component, but
// UTC in a server component (Vercel's Node runtime), which silently shifts
// every displayed time by 3 hours. These helpers fix the zone so server and
// client renders always agree with what was actually booked.
const CLINIC_TIME_ZONE = "Asia/Riyadh";

export function formatTimeAr(iso: string) {
  return new Intl.DateTimeFormat("ar-SA", {
    timeStyle: "short",
    timeZone: CLINIC_TIME_ZONE,
  }).format(new Date(iso));
}

export function formatDateTimeAr(iso: string) {
  return new Intl.DateTimeFormat("ar-SA", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: CLINIC_TIME_ZONE,
  }).format(new Date(iso));
}

export function formatDateAr(iso: string) {
  return new Intl.DateTimeFormat("ar-SA", {
    dateStyle: "medium",
    timeZone: CLINIC_TIME_ZONE,
  }).format(new Date(iso));
}
