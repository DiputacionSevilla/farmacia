import type { Metadata } from "next";
import "../globals.css";

export const metadata: Metadata = {
  title: {
    default: "Administración — Farmacias de guardia",
    template: "%s — Administración Farmacias Mairena",
  },
  robots: { index: false, follow: false },
};

// Root layout independiente para /admin: sin cabecera ni pie públicos.
export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full bg-brand-blue-50 text-foreground">
        {children}
      </body>
    </html>
  );
}
