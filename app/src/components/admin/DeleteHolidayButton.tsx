"use client";

import { useTransition } from "react";
import { deleteHolidayAction } from "@/lib/actions/holiday-actions";

export function DeleteHolidayButton({ holidayId }: { holidayId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm("¿Eliminar este festivo?")) return;
        startTransition(() => deleteHolidayAction(holidayId));
      }}
      className="tap-target rounded-lg border border-status-warn px-3 py-1.5 text-xs font-medium text-status-warn hover:bg-status-warn-bg disabled:opacity-60"
    >
      {pending ? "Eliminando…" : "Eliminar"}
    </button>
  );
}
