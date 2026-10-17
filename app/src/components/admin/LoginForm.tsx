"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "@/lib/actions/auth-actions";

const initialState: LoginState = { error: null };

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-brand-blue-900">
          Correo electrónico
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="username"
          className="tap-target mt-1 w-full rounded-lg border border-brand-blue-200 px-3 py-2 text-brand-blue-900"
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-brand-blue-900">
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="tap-target mt-1 w-full rounded-lg border border-brand-blue-200 px-3 py-2 text-brand-blue-900"
        />
      </div>

      {state.error && (
        <p role="alert" className="text-sm font-medium text-status-warn">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="tap-target rounded-lg bg-brand-blue-900 px-4 py-2 font-semibold text-white hover:bg-brand-blue-800 disabled:opacity-60"
      >
        {pending ? "Accediendo…" : "Acceder"}
      </button>
    </form>
  );
}
