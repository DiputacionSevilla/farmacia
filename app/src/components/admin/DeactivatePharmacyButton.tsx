"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deactivatePharmacyAction } from "@/lib/actions/pharmacy-actions";

export function DeactivatePharmacyButton({ pharmacyId }: { pharmacyId: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm("¿Desactivar esta farmacia? Dejará de mostrarse públicamente.")) {
          return;
        }
        startTransition(async () => {
          await deactivatePharmacyAction(pharmacyId);
          router.push("/admin/pharmacies");
        });
      }}
      className="tap-target rounded-lg border border-status-warn px-3 py-1.5 text-sm font-medium text-status-warn hover:bg-status-warn-bg disabled:opacity-60"
    >
      {pending ? "Desactivando…" : "Desactivar"}
    </button>
  );
}
