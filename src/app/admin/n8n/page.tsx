import { PageHeader } from "@/components/shared/PageHeader";
import { N8nMonitor } from "@/components/admin/N8nMonitor";

export default function N8nMonitorPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="مراقبة n8n"
        description="حالة سير العمل والتنفيذات الأخيرة"
      />
      <N8nMonitor />
    </div>
  );
}
