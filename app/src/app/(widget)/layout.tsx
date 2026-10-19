import type { Metadata, Viewport } from "next";
import "../globals.css";

export const metadata: Metadata = {
  title: "Farmacia de guardia — Mairena del Alcor",
  // Contenido para incrustar en la web municipal: no debe indexarse por
  // separado (la versión canónica es la propia aplicación).
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

// Root layout independiente para /widget: sin cabecera, pie, banner de
// conectividad ni service worker, pensado para vivir dentro de un iframe.
export default function WidgetRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="antialiased">
      <body className="bg-transparent text-foreground">{children}</body>
    </html>
  );
}
