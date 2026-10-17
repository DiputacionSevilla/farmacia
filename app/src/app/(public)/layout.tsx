import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ConnectivityBanner } from "@/components/ConnectivityBanner";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_NAME = "Farmacias de guardia — Mairena del Alcor";
const SITE_DESCRIPTION =
  "Servicio informativo municipal del Ayuntamiento de Mairena del Alcor: consulta qué farmacias están abiertas ahora y cuál está de guardia, según el calendario oficial del Colegio de Farmacéuticos de Sevilla.";

export const metadata: Metadata = {
  metadataBase: new URL("https://farmacias.mairenadelalcor.net"),
  title: {
    default: SITE_NAME,
    template: `%s — ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: "Farmacias Mairena",
  appleWebApp: {
    capable: true,
    title: "Farmacias Mairena",
    statusBarStyle: "default",
  },
  openGraph: {
    type: "website",
    locale: "es_ES",
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f2a5e",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <a
          href="#contenido-principal"
          className="sr-only-focusable fixed left-2 top-2 z-50 rounded bg-brand-blue-900 px-4 py-2 text-white"
        >
          Saltar al contenido principal
        </a>
        <ServiceWorkerRegister />
        <ConnectivityBanner />
        <SiteHeader />
        <main id="contenido-principal" className="flex-1">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
