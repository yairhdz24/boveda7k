import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Busca el ícono real de un sitio: lee su HTML (<link rel="icon" | "apple-touch-icon">) y su manifest,
 * y devuelve el más grande que cargue de verdad. El servicio de Google solo conoce sitios populares:
 * con sitios nuevos o privados devuelve un globo genérico.
 * La ruta queda protegida por el middleware (solo usuarios con sesión).
 */
export const runtime = "nodejs";

const UA = "Mozilla/5.0 (compatible; BovedaFavicon/1.0)";
const TIMEOUT = 6000;

type Candidate = { url: string; size: number };

function isPrivate(ip: string) {
  if (ip === "::1" || ip.startsWith("fc") || ip.startsWith("fd") || ip.startsWith("fe80")) return true;
  const v4 = ip.replace(/^::ffff:/, "");
  const [a, b] = v4.split(".").map(Number);
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
}

/** Evita que la ruta se use para llegar a la red interna del servidor. */
async function assertPublic(u: URL) {
  if (!/^https?:$/.test(u.protocol)) throw new Error("URL no válida");
  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) throw new Error("Host no permitido");
  const addrs = isIP(host) ? [host] : (await lookup(host, { all: true })).map((a) => a.address);
  if (addrs.some(isPrivate)) throw new Error("Host no permitido");
}

async function get(url: string, init?: RequestInit) {
  const u = new URL(url);
  await assertPublic(u);
  return fetch(u, { ...init, headers: { "user-agent": UA, accept: "*/*" }, redirect: "follow", signal: AbortSignal.timeout(TIMEOUT) });
}

const attr = (tag: string, name: string) => tag.match(new RegExp(`${name}\\s*=\\s*["']([^"']+)["']`, "i"))?.[1];

function sizeOf(sizes: string | undefined, href: string) {
  if (/\.svg(\?|$)/i.test(href) || sizes === "any") return 1000; // vectorial: se ve bien a cualquier tamaño
  const n = sizes?.match(/(\d+)x\d+/g)?.map((s) => parseInt(s, 10));
  return n?.length ? Math.max(...n) : 0;
}

async function isImage(url: string) {
  try {
    const r = await get(url);
    const type = r.headers.get("content-type") ?? "";
    await r.body?.cancel();
    return r.ok && (type.startsWith("image/") || type.includes("octet-stream"));
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("url")?.trim();
  if (!raw) return NextResponse.json({ error: "Falta la URL del sitio." }, { status: 400 });

  let page: URL;
  try {
    page = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    await assertPublic(page);
  } catch (e) {
    const msg = (e as Error).message === "Host no permitido" ? "Esa dirección no está permitida." : "No pudimos abrir ese sitio. Revisa la URL.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const candidates: Candidate[] = [];
  try {
    const res = await get(page.href);
    const base = new URL(res.url || page.href);
    const html = (await res.text()).slice(0, 400_000);

    for (const tag of html.match(/<link\b[^>]*>/gi) ?? []) {
      const rel = attr(tag, "rel")?.toLowerCase() ?? "";
      const href = attr(tag, "href");
      if (!href) continue;
      if (/\bicon\b|apple-touch-icon/.test(rel)) {
        const bonus = rel.includes("apple-touch-icon") ? 180 : 0; // suelen ser 180×180 aunque no lo digan
        candidates.push({ url: new URL(href, base).href, size: Math.max(sizeOf(attr(tag, "sizes"), href), bonus) });
      }
      if (rel === "manifest") {
        try {
          const murl = new URL(href, base);
          const m = (await (await get(murl.href)).json()) as { icons?: { src: string; sizes?: string }[] };
          for (const i of m.icons ?? []) candidates.push({ url: new URL(i.src, murl).href, size: sizeOf(i.sizes, i.src) });
        } catch { /* manifest roto: se ignora */ }
      }
    }
    candidates.push({ url: new URL("/favicon.ico", base).href, size: 16 });
  } catch {
    // El sitio no respondió: queda el respaldo de Google
  }

  const seen = new Set<string>();
  const ordered = candidates.sort((a, b) => b.size - a.size).filter((c) => !seen.has(c.url) && seen.add(c.url));
  for (const c of ordered.slice(0, 8)) {
    if (await isImage(c.url)) return NextResponse.json({ url: c.url, source: "site" });
  }

  // Respaldo: Google, solo si de verdad conoce el sitio (si no, responde 404 con un globo)
  const google = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(page.hostname)}&sz=128`;
  try {
    const r = await fetch(google, { signal: AbortSignal.timeout(TIMEOUT) });
    await r.body?.cancel();
    if (r.ok) return NextResponse.json({ url: google, source: "google" });
  } catch { /* sin respaldo */ }

  return NextResponse.json({ error: "No encontramos un ícono en ese sitio. Súbelo a mano o busca en SVGL." }, { status: 404 });
}
