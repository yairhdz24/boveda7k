"use client";

import { useEffect, useRef, useState } from "react";
import { Globe, Search, Upload, X } from "lucide-react";
import { uploadLogo } from "@/lib/data";
import { searchSvgl } from "@/lib/presets";
import { useVault } from "@/lib/vault";
import { Button, Field, IconButton, LogoTile } from "@/components/ui";

type Mode = null | "svgl" | "url";

/** Logo: buscar en SVGL, subir archivo, pegar URL o tomar el favicon del sitio. */
export function LogoPicker({ value, onChange, name, siteUrl }: { value: string | null; onChange: (v: string | null) => void; name: string; siteUrl?: string | null }) {
  const { toast } = useVault();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<Mode>(null);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<{ title: string; url: string; category: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchErr, setSearchErr] = useState<string | null>(null);
  const [findingIcon, setFindingIcon] = useState(false);

  // Búsqueda con pausa de 300 ms
  useEffect(() => {
    if (mode !== "svgl") return;
    const term = q.trim();
    if (!term) { setResults([]); return; }
    setSearching(true);
    setSearchErr(null);
    const t = setTimeout(() => {
      searchSvgl(term)
        .then(setResults)
        .catch((e: Error) => setSearchErr(e.message))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(t);
  }, [q, mode]);

  async function onFile(f: File | undefined) {
    if (!f) return;
    setBusy(true);
    try {
      onChange(await uploadLogo(f));
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  /** Pide al servidor el ícono real del sitio (lee su HTML y su manifest). */
  async function fetchSiteIcon() {
    if (!siteUrl) return;
    setFindingIcon(true);
    try {
      const res = await fetch(`/api/favicon?url=${encodeURIComponent(siteUrl)}`);
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "No se pudo obtener el ícono del sitio.");
      onChange(data.url);
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setFindingIcon(false);
    }
  }
  const openSvgl = () => {
    setMode(mode === "svgl" ? null : "svgl");
    if (!q) setQ(name);
  };

  return (
    <div className="bv-field">
      <span className="bv-label">Logo</span>
      <div className="logo-picker">
        <LogoTile src={value} name={name || "?"} size={64} />
        <div className="logo-picker-actions">
          <Button size="sm" variant={mode === "svgl" ? "primary" : "secondary"} icon={<Search />} onClick={openSvgl}>Buscar en SVGL</Button>
          <Button size="sm" icon={<Upload />} loading={busy} onClick={() => input.current?.click()}>Subir</Button>
          {siteUrl?.trim() && <Button size="sm" icon={<Globe />} loading={findingIcon} onClick={fetchSiteIcon}>Favicon del sitio</Button>}
          <Button size="sm" variant="ghost" onClick={() => setMode(mode === "url" ? null : "url")}>Pegar URL</Button>
          {value && <IconButton label="Quitar logo" onClick={() => onChange(null)}><X /></IconButton>}
        </div>
        <input ref={input} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif" hidden onChange={(e) => onFile(e.target.files?.[0])} />
      </div>

      {mode === "url" && <Field placeholder="https://…/logo.svg" mono value={value ?? ""} onChange={(e) => onChange(e.target.value || null)} />}

      {mode === "svgl" && (
        <div className="svgl-box">
          <Field placeholder="Supabase, Stripe, Notion…" value={q} onChange={(e) => setQ(e.target.value)} autoFocus aria-label="Buscar logo en SVGL" />
          <div className="svgl-grid">
            {searching && <span className="bv-hint">Buscando…</span>}
            {!searching && searchErr && <span className="bv-error">{searchErr}</span>}
            {!searching && !searchErr && q.trim() && results.length === 0 && (
              <span className="bv-hint">SVGL no tiene “{q.trim()}”. Sube el logo o usa el favicon del sitio.</span>
            )}
            {results.map((r) => (
              <button key={r.url} type="button" className={`svgl-opt ${value === r.url ? "is-on" : ""}`} onClick={() => { onChange(r.url); setMode(null); }} title={r.title}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <span className="svgl-img"><img src={r.url} alt="" /></span>
                <span>{r.title}</span>
              </button>
            ))}
          </div>
          <span className="bv-hint">Logos de svgl.app</span>
        </div>
      )}
    </div>
  );
}
