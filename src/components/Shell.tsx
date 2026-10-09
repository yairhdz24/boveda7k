"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Blocks, Copy, Fingerprint, KeyRound, LayoutGrid, Lock, LogOut, Menu, Moon, Plus, Search, Sun } from "lucide-react";
import { currentEmail, listClients, listCredentials, listServices, signOut } from "@/lib/data";
import { useDek, useVault } from "@/lib/vault";
import type { Client, Credential, Service } from "@/lib/types";
import { IconButton, LogoTile } from "@/components/ui";
import { ClientDialog } from "@/components/forms/ClientDialog";
import { SecurityDialog } from "@/components/SecurityDialog";

type DataCtx = {
  clients: Client[];
  services: Service[];
  loading: boolean;
  reload: () => Promise<void>;
  serviceById: (id: string | null) => Service | undefined;
  openNewClient: () => void;
};
const Ctx = createContext<DataCtx | null>(null);
export const useData = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error("useData fuera de Shell");
  return v;
};

export function Shell({ children }: { children: ReactNode }) {
  const { lock, toast } = useVault();
  const pathname = usePathname();
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [navOpen, setNavOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [newClientOpen, setNewClientOpen] = useState(false);
  const [securityOpen, setSecurityOpen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [email, setEmail] = useState("");

  const reload = useCallback(async () => {
    try {
      const [c, s] = await Promise.all([listClients(), listServices()]);
      setClients(c);
      setServices(s);
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    reload();
    currentEmail().then(setEmail);
    setTheme((document.documentElement.dataset.theme as "dark" | "light") || "dark");
    // Atajo de la app instalada: /?buscar=1 abre el buscador
    if (new URLSearchParams(location.search).has("buscar")) setPaletteOpen(true);
  }, [reload]);

  useEffect(() => setNavOpen(false), [pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        // Con el panel lateral abierto (modal) el buscador quedaría sin foco ni clics
        if (document.querySelector('[role="dialog"][data-state="open"]')) return;
        setPaletteOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    document.querySelectorAll("meta[name=theme-color]").forEach((m) => m.setAttribute("content", next === "dark" ? "#070908" : "#f3f6f4"));
    try { localStorage.setItem("bv-theme", next); } catch { /* sin almacenamiento */ }
  };

  const serviceMap = useMemo(() => new Map(services.map((s) => [s.id, s])), [services]);
  const value: DataCtx = {
    clients,
    services,
    loading,
    reload,
    serviceById: (id) => (id ? serviceMap.get(id) : undefined),
    openNewClient: () => setNewClientOpen(true),
  };

  return (
    <Ctx.Provider value={value}>
      <div className={`shell ${navOpen ? "nav-open" : ""}`}>
        <header className="mobile-bar">
          <Link href="/" className="brand">
            <span className="brand-mark"><KeyRound /></span>
            <span className="brand-name">Bóveda</span>
          </Link>
          <div className="mobile-bar-actions">
            <IconButton label={theme === "dark" ? "Tema Día" : "Tema Noche"} onClick={toggleTheme}>{theme === "dark" ? <Sun /> : <Moon />}</IconButton>
            <IconButton label="Bloquear bóveda" onClick={lock}><Lock /></IconButton>
          </div>
        </header>
        {navOpen && <div className="scrim" onClick={() => setNavOpen(false)} />}

        <aside className="sidebar">
          <Link href="/" className="brand">
            <span className="brand-mark"><KeyRound /></span>
            <span className="brand-name">Bóveda</span>
          </Link>

          <button type="button" className="search-btn" onClick={() => setPaletteOpen(true)}>
            <Search /> Buscar <kbd>⌘K</kbd>
          </button>

          <nav className="nav">
            <Link href="/" className={`nav-link ${pathname === "/" ? "is-active" : ""}`}><LayoutGrid /><span>Clientes</span></Link>
            <Link href="/servicios" className={`nav-link ${pathname === "/servicios" ? "is-active" : ""}`}><Blocks /><span>Servicios</span></Link>
          </nav>

          <div className="nav-clients">
            <div className="nav-title">
              <span>Clientes</span>
              <IconButton label="Nuevo cliente" onClick={() => setNewClientOpen(true)} style={{ width: 26, height: 26 }}><Plus /></IconButton>
            </div>
            <div className="nav">
              {clients.map((c) => (
                <Link key={c.id} href={`/clientes/${c.id}`} className={`nav-link ${pathname === `/clientes/${c.id}` ? "is-active" : ""}`}>
                  <LogoTile src={c.logo_url} name={c.name} size={26} />
                  <span>{c.name}</span>
                  <span className="nav-count">{c.credential_count ?? ""}</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="vault-status">
            <span className="vault-dot" aria-hidden />
            <div className="vault-status-text">
              Desbloqueada
              <small>{email}</small>
            </div>
            <div className="vault-actions">
              <IconButton label={theme === "dark" ? "Tema Día" : "Tema Noche"} onClick={toggleTheme}>{theme === "dark" ? <Sun /> : <Moon />}</IconButton>
              <IconButton label="Seguridad y dispositivos" onClick={() => setSecurityOpen(true)}><Fingerprint /></IconButton>
              <IconButton label="Bloquear bóveda" onClick={lock}><Lock /></IconButton>
              <IconButton label="Cerrar sesión" onClick={async () => { lock(); await signOut(); }}><LogOut /></IconButton>
            </div>
          </div>
        </aside>

        <main className="main">{children}</main>

        <nav className="tabbar" aria-label="Navegación">
          <Link href="/" className={`tab ${pathname === "/" || pathname.startsWith("/clientes") ? "is-active" : ""}`}><LayoutGrid /><span>Clientes</span></Link>
          <Link href="/servicios" className={`tab ${pathname === "/servicios" ? "is-active" : ""}`}><Blocks /><span>Servicios</span></Link>
          <button type="button" className="tab-fab" aria-label="Nuevo cliente" onClick={() => setNewClientOpen(true)}><Plus /></button>
          <button type="button" className="tab" onClick={() => setPaletteOpen(true)}><Search /><span>Buscar</span></button>
          <button type="button" className={`tab ${navOpen ? "is-active" : ""}`} onClick={() => setNavOpen(true)}><Menu /><span>Más</span></button>
        </nav>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <ClientDialog open={newClientOpen} onClose={() => setNewClientOpen(false)} />
      <SecurityDialog open={securityOpen} onClose={() => setSecurityOpen(false)} />
    </Ctx.Provider>
  );
}

/* ⌘K — busca clientes y credenciales (descifradas en memoria) */
function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const dek = useDek();
  const { copy } = useVault();
  const { clients, serviceById } = useData();
  const [q, setQ] = useState("");
  const [creds, setCreds] = useState<Credential[]>([]);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open) {
      setQ("");
      setIdx(0);
      d.showModal();
      listCredentials(dek).then(setCreds).catch(() => setCreds([]));
    } else if (d.open) d.close();
  }, [open, dek]);

  const clientMap = useMemo(() => new Map(clients.map((c) => [c.id, c])), [clients]);
  type Item = { key: string; title: string; sub: string; logo: string | null; logoName: string; href: string; copyValue?: string; copyLabel?: string };
  const items: Item[] = useMemo(() => {
    const term = q.trim().toLowerCase();
    const match = (...s: (string | null | undefined)[]) => !term || s.some((x) => x?.toLowerCase().includes(term));
    const cl: Item[] = clients
      .filter((c) => match(c.name, c.website_url))
      .map((c) => ({ key: c.id, title: c.name, sub: "Cliente", logo: c.logo_url, logoName: c.name, href: `/clientes/${c.id}` }));
    const cr: Item[] = creds
      .filter((k) => {
        const svc = serviceById(k.service_id);
        const client = clientMap.get(k.client_id);
        const user = k.secret?.fields.find((f) => !f.secret)?.value;
        return match(k.title, svc?.name, client?.name, user);
      })
      .map((k) => {
        const svc = serviceById(k.service_id);
        const client = clientMap.get(k.client_id);
        const pw = k.secret?.fields.find((f) => f.secret && f.value);
        return {
          key: k.id,
          title: `${svc?.name ?? "Credencial"} · ${k.title}`,
          sub: client?.name ?? "",
          logo: svc?.logo_url ?? null,
          logoName: svc?.name ?? k.title,
          href: `/clientes/${k.client_id}#c-${k.id}`,
          copyValue: pw?.value,
          copyLabel: pw?.label,
        };
      });
    return [...cl, ...cr].slice(0, 40);
  }, [q, clients, creds, serviceById, clientMap]);

  const go = (it: Item) => {
    onClose();
    router.push(it.href);
  };

  return (
    <dialog ref={ref} className="palette" onClose={onClose} onMouseDown={(e) => e.target === ref.current && onClose()}>
      <div className="palette-grabber" aria-hidden />
      <div className="palette-input">
        <Search />
        <input
          autoFocus
          placeholder="Buscar cliente, servicio o usuario…"
          enterKeyHint="search"
          value={q}
          onChange={(e) => { setQ(e.target.value); setIdx(0); }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setIdx((i) => Math.min(i + 1, items.length - 1)); }
            if (e.key === "ArrowUp") { e.preventDefault(); setIdx((i) => Math.max(i - 1, 0)); }
            if (e.key === "Enter" && items[idx]) { e.preventDefault(); go(items[idx]); }
          }}
        />
        <button type="button" className="palette-cancel" onClick={onClose}>Cancelar</button>
      </div>
      <div className="palette-list">
        {items.length === 0 && <div className="palette-empty">Sin resultados</div>}
        {items.map((it, i) => (
          <div key={it.key} className={`palette-item ${i === idx ? "is-on" : ""}`} onMouseEnter={() => setIdx(i)}>
            <button type="button" className="palette-item" style={{ padding: 0, background: "none" }} onClick={() => go(it)}>
              <LogoTile src={it.logo} name={it.logoName} size={32} />
              <span className="palette-item-body"><b>{it.title}</b><small>{it.sub}</small></span>
            </button>
            {it.copyValue && (
              <IconButton label={`Copiar ${it.copyLabel}`} onClick={() => copy(it.copyValue!, it.copyLabel)}><Copy /></IconButton>
            )}
          </div>
        ))}
      </div>
    </dialog>
  );
}
