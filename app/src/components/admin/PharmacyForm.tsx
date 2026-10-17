"use client";

import { useActionState } from "react";
import {
  savePharmacyAction,
  type PharmacyFormState,
} from "@/lib/actions/pharmacy-actions";

const WEEKDAY_LABELS: Array<[number, string]> = [
  [1, "Lunes"],
  [2, "Martes"],
  [3, "Miércoles"],
  [4, "Jueves"],
  [5, "Viernes"],
  [6, "Sábado"],
  [7, "Domingo"],
];

export interface PharmacyFormValues {
  id?: string;
  displayName: string;
  officialName: string;
  ownerName: string;
  address: string;
  postalCode: string;
  municipality: string;
  phone: string;
  latitude: string;
  longitude: string;
  active: boolean;
  verificationStatus: string;
  rulesByWeekday: Record<number, Array<{ opensAt: string; closesAt: string }>>;
}

const initialState: PharmacyFormState = { error: null };

export function PharmacyForm({ values }: { values: PharmacyFormValues }) {
  const action = savePharmacyAction.bind(null, values.id ?? null);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="mt-4 flex flex-col gap-6">
      <fieldset className="grid gap-4 rounded-xl border border-brand-blue-100 bg-white p-4 sm:grid-cols-2">
        <legend className="px-1 font-semibold text-brand-blue-900">
          Datos generales
        </legend>
        <Field label="Nombre público" name="displayName" defaultValue={values.displayName} required />
        <Field label="Nombre oficial" name="officialName" defaultValue={values.officialName} />
        <Field label="Titular" name="ownerName" defaultValue={values.ownerName} />
        <Field label="Teléfono" name="phone" defaultValue={values.phone} />
        <Field label="Dirección" name="address" defaultValue={values.address} required className="sm:col-span-2" />
        <Field label="Código postal" name="postalCode" defaultValue={values.postalCode} />
        <Field label="Municipio" name="municipality" defaultValue={values.municipality} required />
        <Field label="Latitud" name="latitude" defaultValue={values.latitude} type="number" step="any" />
        <Field label="Longitud" name="longitude" defaultValue={values.longitude} type="number" step="any" />

        <label className="flex items-center gap-2 text-sm text-brand-blue-900">
          <input type="checkbox" name="active" defaultChecked={values.active} />
          Farmacia activa (visible públicamente)
        </label>
        <label className="flex items-center gap-2 text-sm text-brand-blue-900">
          <input
            type="checkbox"
            name="markConfirmed"
            defaultChecked={values.verificationStatus === "confirmed"}
          />
          Marcar horario como confirmado por una fuente fiable
        </label>
      </fieldset>

      <fieldset className="rounded-xl border border-brand-blue-100 bg-white p-4">
        <legend className="px-1 font-semibold text-brand-blue-900">
          Horario ordinario semanal
        </legend>
        <p className="text-sm text-brand-blue-700">
          Hasta dos tramos por día (p. ej. mañana y tarde). Deja en blanco los
          que no apliquen.
        </p>
        <div className="mt-3 grid gap-3">
          {WEEKDAY_LABELS.map(([weekday, label]) => {
            const existing = values.rulesByWeekday[weekday] ?? [];
            return (
              <div key={weekday} className="grid grid-cols-[6rem_1fr_1fr] items-center gap-2 text-sm">
                <span className="font-medium text-brand-blue-900">{label}</span>
                {[0, 1].map((slot) => (
                  <div key={slot} className="flex items-center gap-1">
                    <input
                      type="time"
                      name={`opens_${weekday}_${slot + 1}`}
                      defaultValue={existing[slot]?.opensAt ?? ""}
                      aria-label={`${label}, tramo ${slot + 1}, apertura`}
                      className="w-full rounded border border-brand-blue-200 px-2 py-1"
                    />
                    <span aria-hidden="true">–</span>
                    <input
                      type="time"
                      name={`closes_${weekday}_${slot + 1}`}
                      defaultValue={existing[slot]?.closesAt ?? ""}
                      aria-label={`${label}, tramo ${slot + 1}, cierre`}
                      className="w-full rounded border border-brand-blue-200 px-2 py-1"
                    />
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </fieldset>

      {state.error && (
        <p role="alert" className="text-sm font-medium text-status-warn">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="tap-target self-start rounded-lg bg-brand-blue-900 px-5 py-2.5 font-semibold text-white hover:bg-brand-blue-800 disabled:opacity-60"
      >
        {pending ? "Guardando…" : "Guardar"}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  defaultValue,
  required,
  type = "text",
  step,
  className,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
  type?: string;
  step?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={name} className="block text-sm font-medium text-brand-blue-900">
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        step={step}
        required={required}
        defaultValue={defaultValue}
        className="tap-target mt-1 w-full rounded-lg border border-brand-blue-200 px-3 py-2 text-sm text-brand-blue-900"
      />
    </div>
  );
}
