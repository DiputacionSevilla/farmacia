"use client";

import { useEffect } from "react";

/** RF007 — registra el service worker versionado y vigila actualizaciones. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .catch((err) => console.error("No se pudo registrar el service worker", err));
  }, []);

  return null;
}
