"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const REFRESH_MS = 5 * 60 * 1000;

/**
 * Comportamiento de cliente del widget incrustado:
 *  - Avisa a la página anfitriona (OpenCms) de la altura del contenido para
 *    que el iframe se ajuste sin barras de desplazamiento.
 *  - Refresca los datos cada 5 minutos y al volver a primer plano, porque
 *    una pestaña abierta durante horas no debe seguir mostrando la guardia
 *    anterior tras un cambio de turno (09:30 / 22:00).
 */
export function WidgetRuntime() {
  const router = useRouter();

  useEffect(() => {
    const postHeight = () => {
      window.parent.postMessage(
        {
          type: "farmacias-guardia-widget:height",
          height: document.documentElement.scrollHeight,
        },
        "*"
      );
    };
    postHeight();
    const observer = new ResizeObserver(postHeight);
    observer.observe(document.body);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const timer = window.setInterval(refresh, REFRESH_MS);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [router]);

  return null;
}
