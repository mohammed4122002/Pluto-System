import { TableCell, TableRow } from "@/components/ui/table";
import { ReminderStatusBadge, type ReminderStatus } from "@/components/clinic/ReminderStatusBadge";
import { AppointmentActionsMenu } from "@/components/clinic/AppointmentActionsMenu";
import { formatTimeAr } from "@/lib/format";
import type { Appointment } from "@/types";

function reminderStatusOf(appointment: Appointment): ReminderStatus {
  if (appointment.reminder_sent) return "sent";
  if (!appointment.patient_phone) return "failed";
  return "pending";
}

export function AppointmentRow({
  clinicId,
  appointment,
  actions,
  readOnly = false,
}: {
  clinicId: string;
  appointment: Appointment;
  /** Extra content (e.g. a "view all" link) rendered before the actions menu. */
  actions?: React.ReactNode;
  /** Hide the edit/status actions menu — used for the doctor's read-only view. */
  readOnly?: boolean;
}) {
  const time = formatTimeAr(appointment.appointment_time);

  return (
    <TableRow>
      <TableCell dir="ltr" className="text-end font-medium">
        {time}
      </TableCell>
      <TableCell>{appointment.patient_name ?? "—"}</TableCell>
      <TableCell dir="ltr" className="text-end">
        {appointment.patient_phone ?? "—"}
      </TableCell>
      <TableCell>
        <ReminderStatusBadge
          status={reminderStatusOf(appointment)}
          detail={
            appointment.reminder_sent_at
              ? formatTimeAr(appointment.reminder_sent_at)
              : appointment.patient_phone
                ? undefined
                : "رقم خاطئ"
          }
        />
      </TableCell>
      <TableCell>
        <div className="flex items-center justify-end gap-2">
          {actions}
          {!readOnly && (
            <AppointmentActionsMenu clinicId={clinicId} appointment={appointment} />
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}
