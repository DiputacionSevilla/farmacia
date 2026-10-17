import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-brand-blue-50 text-foreground">
        {children}
      </body>
    </html>
  );
}
