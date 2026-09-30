import type { MetadataRoute } from "next";
import { SITE_DESCRIPTION } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Bóveda",
    short_name: "Bóveda",
    description: SITE_DESCRIPTION,
    lang: "es",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#070908",
    theme_color: "#070908",
    categories: ["productivity", "utilities"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Buscar credencial", url: "/?buscar=1", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Servicios", url: "/servicios", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
