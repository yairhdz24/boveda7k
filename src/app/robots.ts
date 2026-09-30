import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Se permite rastrear todo para que Google lea el noindex de cada página;
// sin sesión, cualquier ruta privada redirige a /login.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/api/" },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
