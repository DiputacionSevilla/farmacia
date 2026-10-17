"use client";

import { useActionState, useState } from "react";
import { publishCandidateAction, type ActionResult } from "@/lib/actions/calendar-actions";

const initial: ActionResult = { error: null, message: null };

export function PublishCandidateForm({ candidateId }: { candidateId: string }) {
  const [comment, setComment] = useState("");
  const [state, formAction, pending] = useActionState(
    () => publishCandidateAction(candidateId, comment),
    initial
  );

  return (
    <form action={formAction} className="rounded-xl border border-brand-orange-300 bg-brand-orange-50 p-4">
      <label htmlFor="comment" className="block text-sm font-medium text-brand-blue-900">
        Comentario de publicación (opcional)
      </label>
      <textarea
        id="comment"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={2}
        className="mt-1 w-full rounded-lg border border-brand-blue-200 px-3 py-2 text-sm"
        placeholder="Ej.: calendario del cuarto trimestre, sin incidencias."
      />
      <button
        type="submit"
        disabled={pending}
        className="tap-target mt-3 rounded-lg bg-brand-orange-600 px-4 py-2 font-semibold text-white hover:bg-brand-orange-700 disabled:opacity-60"
      >
        {pending ? "Publicando…" : "Publicar esta versión"}
      </button>
      {(state.message || state.error) && (
        <p
          role="status"
          className={`mt-2 text-sm ${state.error ? "text-status-warn" : "text-status-open"}`}
        >
          {state.error ?? state.message}
        </p>
      )}
    </form>
  );
}
