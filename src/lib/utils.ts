import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// "Dr. Ahmed Family Clinic" -> "clinic_dr_ahmed_family_clinic"
export function slugifyClinicKey(name: string) {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9؀-ۿ\s-]/g, "")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_");
  return slug ? `clinic_${slug}` : "";
}
