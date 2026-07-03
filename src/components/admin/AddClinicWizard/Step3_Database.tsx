"use client";

import { useState } from "react";
import { Loader2, Database, Server, Sheet } from "lucide-react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { DbType } from "@/types";
import type { StepProps } from "./types";

const DB_OPTIONS: { type: DbType; label: string; icon: typeof Database }[] = [
  { type: "supabase", label: "Supabase", icon: Database },
  { type: "sql_server", label: "SQL Server", icon: Server },
  { type: "google_sheets", label: "Google Sheets", icon: Sheet },
];

export function Step3_Database({ data, update }: StepProps) {
  const [testing, setTesting] = useState(false);
  const dbConfig = data.db_config;

  function patchDb(patch: Partial<typeof dbConfig>) {
    update({ db_config: { ...dbConfig, ...patch } });
  }

  async function handleTest() {
    setTesting(true);
    try {
      const res = await fetch("/api/clinic-db/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dbConfig),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error ?? "فشل الاتصال");
      toast.success("تم الاتصال بنجاح");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "فشل الاتصال");
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {DB_OPTIONS.map(({ type, label, icon: Icon }) => (
          <button
            key={type}
            type="button"
            onClick={() => patchDb({ db_type: type })}
            className={cn(
              "flex flex-col items-center gap-2 rounded-xl border p-6 text-sm font-medium transition-colors",
              dbConfig.db_type === type
                ? "border-primary bg-primary/5"
                : "border-border hover:bg-accent"
            )}
          >
            <Icon className="size-6" />
            {label}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
          {dbConfig.db_type === "supabase" ? (
            <>
              <div className="space-y-2 sm:col-span-2">
                <Label>Project URL</Label>
                <Input
                  dir="ltr"
                  value={dbConfig.sb_project_url ?? ""}
                  onChange={(e) => patchDb({ sb_project_url: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>anon key</Label>
                <Input
                  dir="ltr"
                  type="password"
                  value={dbConfig.sb_anon_key ?? ""}
                  onChange={(e) => patchDb({ sb_anon_key: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>service_role key</Label>
                <Input
                  dir="ltr"
                  type="password"
                  value={dbConfig.sb_service_key ?? ""}
                  onChange={(e) => patchDb({ sb_service_key: e.target.value })}
                />
              </div>
            </>
          ) : dbConfig.db_type === "sql_server" ? (
            <>
              <div className="space-y-2">
                <Label>Host / IP</Label>
                <Input
                  dir="ltr"
                  value={dbConfig.mssql_host ?? ""}
                  onChange={(e) => patchDb({ mssql_host: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Port</Label>
                <Input
                  dir="ltr"
                  type="number"
                  value={dbConfig.mssql_port ?? 1433}
                  onChange={(e) => patchDb({ mssql_port: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Database</Label>
                <Input
                  dir="ltr"
                  value={dbConfig.mssql_database ?? ""}
                  onChange={(e) => patchDb({ mssql_database: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Schema</Label>
                <Input
                  dir="ltr"
                  value={dbConfig.mssql_schema ?? "dbo"}
                  onChange={(e) => patchDb({ mssql_schema: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Username</Label>
                <Input
                  dir="ltr"
                  value={dbConfig.mssql_username ?? ""}
                  onChange={(e) => patchDb({ mssql_username: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input
                  dir="ltr"
                  type="password"
                  value={dbConfig.mssql_password ?? ""}
                  onChange={(e) => patchDb({ mssql_password: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Table: Appointments</Label>
                <Input
                  dir="ltr"
                  value={dbConfig.mssql_table_appointments ?? "Appointments"}
                  onChange={(e) => patchDb({ mssql_table_appointments: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Table: Patients</Label>
                <Input
                  dir="ltr"
                  value={dbConfig.mssql_table_patients ?? "Patients"}
                  onChange={(e) => patchDb({ mssql_table_patients: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Table: Reviews</Label>
                <Input
                  dir="ltr"
                  value={dbConfig.mssql_table_reviews ?? "Reviews"}
                  onChange={(e) => patchDb({ mssql_table_reviews: e.target.value })}
                />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2 sm:col-span-2">
                <Label>رابط جدول البيانات (Spreadsheet URL)</Label>
                <Input
                  dir="ltr"
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  onChange={(e) => {
                    const match = e.target.value.match(/\/d\/([a-zA-Z0-9-_]+)/);
                    patchDb({ gs_spreadsheet_id: match?.[1] ?? e.target.value });
                  }}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Button type="button" variant="outline">
                  ربط حساب Google
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Button type="button" variant="secondary" onClick={handleTest} disabled={testing}>
        {testing ? <Loader2 className="size-4 animate-spin" /> : null}
        اختبار الاتصال
      </Button>
    </div>
  );
}
