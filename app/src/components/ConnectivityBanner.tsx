"use client";

import { useSyncExternalStore } from "react";

function subscribe(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getSnapshot() {
  return !navigator.onLine;
}

function getServerSnapshot() {
  return false;
}

/**
 * RF007/§10.3 — avisa de forma persistente cuando no hay conexión, para que
 * la ciudadanía sepa que puede estar viendo la última versión almacenada.
 */
export function ConnectivityBanner() {
  const isOffline = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (!isOffline) return null;

  return (
    <div
      role="status"
      className="bg-status-warn-bg px-4 py-2 text-center text-sm font-medium text-status-warn"
    >
      Sin conexión. Mostrando la última información guardada en este
      dispositivo; puede no estar actualizada.
    </div>
  );
}
