import type { MetadataRoute } from "next";

// RF007 — manifiesto de instalación PWA.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Farmacias de Guardia — Ayuntamiento de Mairena del Alcor",
    short_name: "Farmacias Mairena",
    description:
      "Servicio informativo municipal: farmacias abiertas y de guardia en Mairena del Alcor.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    lang: "es",
    background_color: "#f7f8fb",
    theme_color: "#0f2a5e",
    categories: ["health", "government", "medical"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
