"use client";

import { useQuery } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import type { Clinic } from "@/types";

export function useClinic(clinicId: string | undefined) {
  return useQuery({
    queryKey: ["clinic", clinicId],
    enabled: !!clinicId,
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("clinics")
        .select("*")
        .eq("id", clinicId as string)
        .single();

      if (error) throw error;
      return data as Clinic;
    },
  });
}
