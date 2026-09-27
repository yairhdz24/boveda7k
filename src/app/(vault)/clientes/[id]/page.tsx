"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronsDownUp, ChevronsUpDown, ExternalLink, KeyRound, Pencil, Plus, Search, SearchX, Trash2, X } from "lucide-react";
import { deleteClient, deleteCredential, getClient, listCredentials } from "@/lib/data";
import { hostOf } from "@/lib/presets";
import { useDek, useVault } from "@/lib/vault";
import type { Client, Credential, Env } from "@/lib/types";
import { ENV_LABEL } from "@/lib/types";
import { useData } from "@/components/Shell";
import { CredentialCard, type Linked } from "@/components/CredentialCard";
import { Button, ConfirmDialog, EmptyState, IconButton, LogoTile } from "@/components/ui";
import { ClientDialog } from "@/components/forms/ClientDialog";
import { CredentialDialog } from "@/components/forms/CredentialDialog";

export default function ClientPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const dek = useDek();
  const { toast } = useVault();
  const { serviceById, reload: reloadShell } = useData();

  const [client, setClient] = useState<Client | null>(null);
  const [creds, setCreds] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [serviceFilter, setServiceFilter] = useState<string | "all">("all");
  const [envFilter, setEnvFilter] = useState<Env | "all">("all");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<Set<string>>(new Set());
  const searchRef = useRef<HTMLInputElement>(null);

  const [editClient, setEditClient] = useState(false);
  const [confirmClient, setConfirmClient] = useState(false);
  const [credDialog, setCredDialog] = useState<{ open: boolean; credential?: Credential }>({ open: false });
  const [toDelete, setToDelete] = useState<Credential | null>(null);

  const load = useCallback(async () => {
    try {
      const [c, k] = await Promise.all([getClient(id), listCredentials(dek, id)]);
      setClient(c);
      setCreds(k);
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setLoading(false);
    }
  }, [id, dek, toast]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  // Salta a la credencial si viene de ⌘K
  useEffect(() => {
    if (loading || !location.hash.startsWith("#c-")) return;
    const cid = location.hash.slice(3);
    setOpen((o) => new Set(o).add(cid));
    requestAnimationFrame(() => document.getElementById(`c-${cid}`)?.scrollIntoView({ behavior: "smooth", block: "center" }));
  }, [loading]);

  // Vínculos "inicia sesión con": hijo → cuenta, y cuenta → quiénes la usan
  const byId = useMemo(() => new Map(creds.map((c) => [c.id, c])), [creds]);
  const usedBy = useMemo(() => {
    const m = new Map<string, Linked[]>();
    for (const c of creds) {
      const v = c.secret?.via;
      if (v && byId.has(v)) m.set(v, [...(m.get(v) ?? []), { credential: c, service: serviceById(c.service_id) }]);
    }
    return m;
  }, [creds, byId, serviceById]);
  const viaOf = useCallback((c: Credential): Linked | "missing" | undefined => {
    const v = c.secret?.via;
    if (!v) return undefined;
    const p = byId.get(v);
    return p ? { credential: p, service: serviceById(p.service_id) } : "missing";
  }, [byId, serviceById]);

  const shown = useMemo(() => {
    const t = query.trim().toLowerCase();
    return creds
      .filter((c) => serviceFilter === "all" || (c.service_id ?? "none") === serviceFilter)
      .filter((c) => envFilter === "all" || c.environment === envFilter)
      .filter((c) => {
        if (!t) return true;
        const svc = serviceById(c.service_id)?.name;
        // Busca en título, servicio, URL y en los campos visibles (nunca en los secretos)
        const visible = (k?: Credential) => k?.secret?.fields.filter((f) => !f.secret).flatMap((f) => [f.label, f.value]) ?? [];
        // Buscar el correo de Google también encuentra todo lo que entra con él
        const parent = c.secret?.via ? byId.get(c.secret.via) : undefined;
        const hay = [c.title, svc, c.login_url, c.secret?.notes, ...visible(c), ...visible(parent), serviceById(parent?.service_id ?? null)?.name];
        return hay.some((x) => x?.toLowerCase().includes(t));
      })
      .sort((x, y) => (serviceById(x.service_id)?.name ?? "~").localeCompare(serviceById(y.service_id)?.name ?? "~") || x.title.localeCompare(y.title));
  }, [creds, serviceFilter, envFilter, query, serviceById, byId]);

  const toggle = (cid: string) => setOpen((o) => { const n = new Set(o); if (n.has(cid)) n.delete(cid); else n.add(cid); return n; });
  const allOpen = shown.length > 0 && shown.every((c) => open.has(c.id));
  /** Abre una credencial y la lleva a la vista; si un filtro la oculta, se quitan los filtros. */
  const jumpTo = (cid: string) => {
    if (!shown.some((c) => c.id === cid)) { setQuery(""); setServiceFilter("all"); setEnvFilter("all"); }
    setOpen((o) => new Set(o).add(cid));
    setTimeout(() => {
      const el = document.getElementById(`c-${cid}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      el?.classList.add("is-flash");
      setTimeout(() => el?.classList.remove("is-flash"), 1200);
    }, 60);
  };
  const toggleAll = () => setOpen(allOpen ? new Set() : new Set(shown.map((c) => c.id)));

  // "/" enfoca el buscador
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.key === "/" && !/INPUT|TEXTAREA|SELECT/.test(el.tagName)) { e.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const serviceIds = useMemo(() => [...new Set(creds.map((c) => c.service_id ?? "none"))], [creds]);
  const envs = useMemo(() => [...new Set(creds.map((c) => c.environment))], [creds]);

  const refresh = async () => {
    await load();
    await reloadShell();
  };

  if (loading && !client) return <div className="center-screen" style={{ minHeight: "50vh" }}><span className="spinner" /></div>;
  if (!client) return <EmptyState icon={<KeyRound />} title="Cliente no encontrado" text="Puede que se haya eliminado." />;

  return (
    <>
      <section className="client-hero">
        <LogoTile src={client.logo_url} name={client.name} size={80} />
        <div className="client-hero-body">
          <h1 className="display-xl">{client.name}</h1>
          {client.website_url && (
            <a className="client-hero-link" href={client.website_url} target="_blank" rel="noreferrer noopener">
              {hostOf(client.website_url)} <ExternalLink />
            </a>
          )}
          <div className="stat-row">
            <span className="stat"><b>{creds.length}</b> credenciales</span>
            <span className="stat"><b>{serviceIds.length}</b> servicios</span>
          </div>
          {client.notes && <p className="muted" style={{ margin: "6px 0 0", whiteSpace: "pre-wrap" }}>{client.notes}</p>}
        </div>
        <div className="client-hero-actions">
          <Button variant="primary" icon={<Plus />} onClick={() => setCredDialog({ open: true })}>Agregar credencial</Button>
          <Button icon={<Pencil />} onClick={() => setEditClient(true)}>Editar</Button>
          <Button variant="ghost" icon={<Trash2 />} onClick={() => setConfirmClient(true)} aria-label="Eliminar cliente" />
        </div>
      </section>

      {creds.length > 0 && (
        <div className="cred-toolbar">
          <div className="cred-toolbar-row">
            <label className="search-field">
              <Search aria-hidden />
              <input
                ref={searchRef}
                type="search"
                placeholder={`Buscar en ${creds.length} credenciales…`}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Escape") setQuery(""); }}
                enterKeyHint="search"
                aria-label="Buscar credenciales"
              />
              {query ? <IconButton label="Limpiar búsqueda" onClick={() => { setQuery(""); searchRef.current?.focus(); }}><X /></IconButton> : <kbd>/</kbd>}
            </label>
            {envs.length > 1 && (
              <div className="segmented">
                <button type="button" className={envFilter === "all" ? "is-on" : undefined} onClick={() => setEnvFilter("all")}>Todos</button>
                {(["prod", "staging", "dev"] as Env[]).filter((e) => envs.includes(e)).map((e) => (
                  <button key={e} type="button" className={envFilter === e ? "is-on" : undefined} onClick={() => setEnvFilter(e)}>{ENV_LABEL[e]}</button>
                ))}
              </div>
            )}
            <Button size="sm" icon={allOpen ? <ChevronsDownUp /> : <ChevronsUpDown />} onClick={toggleAll} disabled={!shown.length}>
              {allOpen ? "Contraer todo" : "Expandir todo"}
            </Button>
          </div>
          {serviceIds.length > 1 && (
            <div className="chips">
              <button type="button" className={`chip ${serviceFilter === "all" ? "is-on" : ""}`} onClick={() => setServiceFilter("all")}>Todos <span className="chip-count">{creds.length}</span></button>
              {serviceIds.map((sid) => {
                const s = serviceById(sid);
                return (
                  <button key={sid} type="button" className={`chip ${serviceFilter === sid ? "is-on" : ""}`} onClick={() => setServiceFilter(serviceFilter === sid ? "all" : sid)}>
                    <LogoTile src={s?.logo_url} name={s?.name ?? "Otros"} size={20} />
                    {s?.name ?? "Otros"}
                    <span className="chip-count">{creds.filter((c) => (c.service_id ?? "none") === sid).length}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {creds.length === 0 ? (
        <EmptyState
          icon={<KeyRound />}
          title="Sin credenciales todavía"
          text="Agrega el primer acceso de este cliente: su Gmail, su Google Tag Manager, su base de datos o su servidor."
          action={<Button variant="primary" icon={<Plus />} onClick={() => setCredDialog({ open: true })}>Agregar credencial</Button>}
        />
      ) : (
        shown.length === 0 ? (
          <EmptyState
            icon={<SearchX />}
            title="Nada coincide"
            text="Prueba con otro término o quita los filtros."
            action={<Button onClick={() => { setQuery(""); setServiceFilter("all"); setEnvFilter("all"); }}>Quitar filtros</Button>}
          />
        ) : (
          <div className="cred-grid">
            {shown.map((c) => (
              <CredentialCard
                key={c.id}
                credential={c}
                service={serviceById(c.service_id)}
                expanded={open.has(c.id)}
                onToggle={() => toggle(c.id)}
                onEdit={() => setCredDialog({ open: true, credential: c })}
                onDelete={() => setToDelete(c)}
                via={viaOf(c)}
                usedBy={usedBy.get(c.id)}
                onJump={jumpTo}
              />
            ))}
          </div>
        )
      )}

      <CredentialDialog open={credDialog.open} credential={credDialog.credential} clientId={client.id} onClose={() => setCredDialog({ open: false })} onSaved={refresh} siblings={creds} />
      <ClientDialog open={editClient} client={client} onClose={() => { setEditClient(false); load(); }} />
      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title="Eliminar credencial"
        message={
          <>
            Se borrará <b>{toDelete?.title}</b> de {serviceById(toDelete?.service_id ?? null)?.name ?? "este cliente"}. No se puede deshacer.
            {toDelete && (usedBy.get(toDelete.id)?.length ?? 0) > 0 && (
              <><br /><br /><b>Ojo:</b> {usedBy.get(toDelete.id)!.map((u) => u.service?.name ?? u.credential.title).join(", ")} inicia(n) sesión con esta cuenta y quedarán sin acceso vinculado.</>
            )}
          </>
        }
        onConfirm={async () => {
          await deleteCredential(toDelete!.id);
          toast("Credencial eliminada");
          await refresh();
        }}
      />
      <ConfirmDialog
        open={confirmClient}
        onClose={() => setConfirmClient(false)}
        title="Eliminar cliente"
        message={<>Se borrará <b>{client.name}</b> y sus {creds.length} credenciales. No se puede deshacer.</>}
        confirmLabel="Eliminar cliente"
        onConfirm={async () => {
          await deleteClient(client.id);
          toast("Cliente eliminado");
          await reloadShell();
          router.replace("/");
        }}
      />
    </>
  );
}
