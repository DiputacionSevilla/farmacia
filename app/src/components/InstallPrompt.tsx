"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function subscribeStandalone(callback: () => void) {
  const mql = window.matchMedia("(display-mode: standalone)");
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

function getStandaloneSnapshot() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function getStandaloneServerSnapshot() {
  return false;
}

function noopSubscribe() {
  return () => {};
}

function getIsIOSSnapshot() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !("MSStream" in window);
}

function getIsIOSServerSnapshot() {
  return false;
}

const DISMISS_KEY = "installPromptDismissed";
const dismissListeners = new Set<() => void>();

function subscribeDismissed(callback: () => void) {
  dismissListeners.add(callback);
  return () => {
    dismissListeners.delete(callback);
  };
}

function getDismissedSnapshot() {
  return sessionStorage.getItem(DISMISS_KEY) === "1";
}

function getDismissedServerSnapshot() {
  return false;
}

function markDismissed() {
  sessionStorage.setItem(DISMISS_KEY, "1");
  for (const listener of dismissListeners) listener();
}

/** RF007 — guía de instalación de la PWA en Android e iOS. */
export function InstallPrompt() {
  const isStandalone = useSyncExternalStore(
    subscribeStandalone,
    getStandaloneSnapshot,
    getStandaloneServerSnapshot
  );
  const isIOS = useSyncExternalStore(
    noopSubscribe,
    getIsIOSSnapshot,
    getIsIOSServerSnapshot
  );

  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const dismissed = useSyncExternalStore(
    subscribeDismissed,
    getDismissedSnapshot,
    getDismissedServerSnapshot
  );

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (isStandalone || dismissed) return null;
  if (!deferredPrompt && !isIOS) return null;

  const dismiss = () => {
    markDismissed();
  };

  return (
    <div className="mx-auto mt-4 max-w-5xl rounded-xl border border-brand-orange-300 bg-brand-orange-50 p-4 text-sm text-brand-blue-900">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">Instala esta aplicación</p>
          {deferredPrompt ? (
            <p>
              Accede más rápido a las farmacias de guardia desde la pantalla
              de inicio de tu dispositivo.
            </p>
          ) : (
            <p>
              En iPhone o iPad: toca el icono compartir{" "}
              <span aria-hidden="true">⎋</span> y después{" "}
              <strong>&quot;Añadir a pantalla de inicio&quot;</strong>.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="tap-target shrink-0 text-brand-blue-700 underline"
          aria-label="Descartar aviso de instalación"
        >
          Cerrar
        </button>
      </div>
      {deferredPrompt && (
        <button
          type="button"
          className="tap-target mt-3 rounded-lg bg-brand-blue-900 px-4 py-2 font-medium text-white hover:bg-brand-blue-800"
          onClick={async () => {
            await deferredPrompt.prompt();
            await deferredPrompt.userChoice;
            setDeferredPrompt(null);
          }}
        >
          Instalar aplicación
        </button>
      )}
    </div>
  );
}
