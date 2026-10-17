import type { NextConfig } from "next";

// Nota de arquitectura: esta aplicación es, por naturaleza, de datos
// dinámicos en tiempo real (RF001 "Abiertas ahora", guardias vigentes).
// "Cache Components" (PPR) de Next.js 16 aporta poco aquí y obliga a anotar
// cada ruta; se mantiene desactivado a favor del renderizado dinámico por
// petición, más simple de razonar y mantener.
const nextConfig: NextConfig = {
  // Paquetes con addon nativo (.node): deben excluirse del empaquetado de
  // Turbopack para Server Components y cargarse con require() de Node
  // directamente (RF009 / Anexo — respaldo OCR).
  serverExternalPackages: ["@napi-rs/canvas", "tesseract.js"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;
