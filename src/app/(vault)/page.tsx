"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Building2, Plus, Search } from "lucide-react";
import { useData } from "@/components/Shell";
import { Button, EmptyState, Field, LogoTile } from "@/components/ui";
import { hostOf } from "@/lib/presets";

export default function ClientsPage() {
  const { clients, loading, openNewClient } = useData();
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return clients.filter((c) => !t || c.name.toLowerCase().includes(t) || c.website_url?.toLowerCase().includes(t));
  }, [clients, q]);
  const total = clients.reduce((n, c) => n + (c.credential_count ?? 0), 0);

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Bóveda</div>
          <h1 className="display-xl">Clientes</h1>
          <p className="muted">{clients.length} clientes · {total} credenciales cifradas</p>
        </div>
        <Button variant="primary" icon={<Plus />} onClick={openNewClient}>Nuevo cliente</Button>
      </div>

      {clients.length > 0 && (
        <div className="toolbar">
          <Field placeholder="Filtrar por nombre o dominio…" value={q} onChange={(e) => setQ(e.target.value)} trailing={<Search size={17} style={{ margin: "0 10px", color: "var(--ink-faint)" }} />} aria-label="Filtrar clientes" />
        </div>
      )}

      {!loading && clients.length === 0 ? (
        <EmptyState
          icon={<Building2 />}
          title="Tu primer cliente"
          text="Da de alta un cliente con su logo y su sitio, y empieza a guardar sus accesos en un solo lugar."
          action={<Button variant="primary" icon={<Plus />} onClick={openNewClient}>Nuevo cliente</Button>}
        />
      ) : (
        <div className="client-grid">
          {filtered.map((c) => (
            <Link key={c.id} href={`/clientes/${c.id}`} className="bv-client-card">
              <LogoTile src={c.logo_url} name={c.name} size={48} />
              <span className="bv-client-card-body">
                <span className="bv-client-card-name">{c.name}</span>
                {c.website_url && <span className="bv-client-card-url">{hostOf(c.website_url)}</span>}
              </span>
              <span className="bv-client-card-count">{c.credential_count ?? 0}</span>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
