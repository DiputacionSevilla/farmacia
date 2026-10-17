"use client";

import { useActionState } from "react";
import { restoreVersionAction, type ActionResult } from "@/lib/actions/calendar-actions";

const initial: ActionResult = { error: null, message: null };

export function RestoreVersionButton({ versionId }: { versionId: string }) {
  const [state, formAction, pending] = useActionState(
    () => restoreVersionAction(versionId),
    initial
  );

  return (
    <div className="inline-flex flex-col items-end">
      <form action={formAction}>
        <button
          type="submit"
          disabled={pending}
          className="tap-target rounded-lg bg-brand-blue-900 px-3 py-1.5 text-white hover:bg-brand-blue-800 disabled:opacity-60"
        >
          {pending ? "Restaurando…" : "Restaurar"}
        </button>
      </form>
      {(state.message || state.error) && (
        <span
          className={`mt-1 text-xs ${state.error ? "text-status-warn" : "text-brand-blue-700"}`}
        >
          {state.error ?? state.message}
        </span>
      )}
    </div>
  );
}
