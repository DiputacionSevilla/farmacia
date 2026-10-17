"use client";

import { useActionState } from "react";
import { createHolidayAction, type HolidayFormState } from "@/lib/actions/holiday-actions";

const initial: HolidayFormState = { error: null };

export function HolidayForm() {
  const [state, formAction, pending] = useActionState(createHolidayAction, initial);

  return (
    <form
      action={formAction}
      className="grid gap-3 rounded-xl border border-brand-blue-100 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      <div>
        <label htmlFor="date" className="block text-sm font-medium text-brand-blue-900">
          Fecha
        </label>
        <input
          id="date"
          name="date"
          type="date"
          required
          className="tap-target mt-1 w-full rounded-lg border border-brand-blue-200 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-brand-blue-900">
          Nombre
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          className="tap-target mt-1 w-full rounded-lg border border-brand-blue-200 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label htmlFor="scope" className="block text-sm font-medium text-brand-blue-900">
          Ámbito
        </label>
        <select
          id="scope"
          name="scope"
          required
          className="tap-target mt-1 w-full rounded-lg border border-brand-blue-200 px-3 py-2 text-sm"
        >
          <option value="national">Nacional</option>
          <option value="regional">Autonómico</option>
          <option value="local">Local (Mairena del Alcor)</option>
        </select>
      </div>
      <div>
        <label htmlFor="officialSourceUrl" className="block text-sm font-medium text-brand-blue-900">
          Fuente oficial (URL)
        </label>
        <input
          id="officialSourceUrl"
          name="officialSourceUrl"
          type="url"
          placeholder="https://www.boe.es/..."
          className="tap-target mt-1 w-full rounded-lg border border-brand-blue-200 px-3 py-2 text-sm"
        />
      </div>

      {state.error && (
        <p role="alert" className="sm:col-span-2 lg:col-span-4 text-sm font-medium text-status-warn">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="tap-target self-end rounded-lg bg-brand-blue-900 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-blue-800 disabled:opacity-60"
      >
        {pending ? "Guardando…" : "Añadir festivo"}
      </button>
    </form>
  );
}
