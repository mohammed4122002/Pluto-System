"use client";

import { useEffect } from "react";

import { createClient } from "@/lib/supabase/client";

// Subscribes to postgres_changes on `table` and calls onChange whenever a
// row is inserted/updated/deleted. Used by clinic dashboards backed by a
// Supabase clinic DB (db_type = 'supabase') to update tables without a
// manual refresh.
export function useRealtime(table: string, onChange: () => void) {
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`realtime:${table}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        onChange
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table]);
}
