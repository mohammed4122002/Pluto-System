import { PageHeader } from "@/components/shared/PageHeader";
import { AddClinicWizard } from "@/components/admin/AddClinicWizard";

export default function NewClinicPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="إضافة عيادة جديدة" description="5 خطوات لإطلاق عيادة جديدة على المنصة" />
      <AddClinicWizard />
    </div>
  );
}
