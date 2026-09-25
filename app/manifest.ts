import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Fravia – Dein Zykluskalender",
    short_name: "Fravia",
    description: "für dich, im Einklang mit deinem Zyklus.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f6f1ea",
    theme_color: "#f6f1ea",
    lang: "de",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
