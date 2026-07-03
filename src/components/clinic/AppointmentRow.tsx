import { TableCell, TableRow } from "@/components/ui/table";
import { ReminderStatusBadge, type ReminderStatus } from "@/components/clinic/ReminderStatusBadge";
import type { Appointment } from "@/types";

function reminderStatusOf(appointment: Appointment): ReminderStatus {
  if (appointment.reminder_sent) return "sent";
  if (!appointment.patient_phone) return "failed";
  return "pending";
}

export function AppointmentRow({
  appointment,
  actions,
}: {
  appointment: Appointment;
  actions?: React.ReactNode;
}) {
  const time = new Intl.DateTimeFormat("ar-SA", { timeStyle: "short" }).format(
    new Date(appointment.appointment_time)
  );

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
              ? new Intl.DateTimeFormat("ar-SA", { timeStyle: "short" }).format(
                  new Date(appointment.reminder_sent_at)
                )
              : appointment.patient_phone
                ? undefined
                : "رقم خاطئ"
          }
        />
      </TableCell>
      <TableCell>{actions}</TableCell>
    </TableRow>
  );
}
