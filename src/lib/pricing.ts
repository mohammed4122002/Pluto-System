import type { Plan } from "@/types";

export const PLANS: Record<
  Plan,
  {
    label: string;
    pricePerMonth: number;
    totalSar: number;
    months: number;
    savingsSar: number;
    badge?: string;
  }
> = {
  monthly: {
    label: "شهري",
    pricePerMonth: 149,
    totalSar: 149,
    months: 1,
    savingsSar: 0,
  },
  quarterly: {
    label: "ربع سنوي",
    pricePerMonth: 119,
    totalSar: 357,
    months: 3,
    savingsSar: 90,
    badge: "الأوفر",
  },
  annual: {
    label: "سنوي",
    pricePerMonth: 99,
    totalSar: 1188,
    months: 12,
    savingsSar: 600,
  },
} as const;
