import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { AppointmentForm } from "@/components/clinic/AppointmentForm";

export default async function NewAppointmentPage({
  params,
}: {
  params: Promise<{ clinicId: string }>;
}) {
  const { clinicId } = await params;

  return (
    <div className="space-y-6">
      <PageHeader title="إضافة موعد" />
      <Card>
        <CardContent className="p-6">
          <AppointmentForm clinicId={clinicId} />
        </CardContent>
      </Card>
    </div>
  );
}
