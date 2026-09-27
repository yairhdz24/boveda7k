"use client";

import { useMemo, useState } from "react";
import { Blocks, ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";
import { deleteService } from "@/lib/data";
import { useVault } from "@/lib/vault";
import { KIND_LABEL, type Service } from "@/lib/types";
import { useData } from "@/components/Shell";
import { Badge, Button, ConfirmDialog, EmptyState, Field, IconButton, LogoTile } from "@/components/ui";
import { ServiceDialog } from "@/components/forms/ServiceDialog";

export default function ServicesPage() {
  const { services, reload } = useData();
  const { toast } = useVault();
  const [q, setQ] = useState("");
  const [dialog, setDialog] = useState<{ open: boolean; service?: Service }>({ open: false });
  const [toDelete, setToDelete] = useState<Service | null>(null);

  const grouped = useMemo(() => {
    const t = q.trim().toLowerCase();
    const map = new Map<string, Service[]>();
    services
      .filter((s) => !t || s.name.toLowerCase().includes(t) || s.category?.toLowerCase().includes(t))
      .forEach((s) => {
        const k = s.category || "Sin categoría";
        map.set(k, [...(map.get(k) ?? []), s]);
      });
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [services, q]);

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Catálogo</div>
          <h1 className="display-xl">Servicios</h1>
          <p className="muted">Las plataformas donde tus clientes tienen cuentas. Cada una con su logo y su plantilla de campos.</p>
        </div>
        <Button variant="primary" icon={<Plus />} onClick={() => setDialog({ open: true })}>Nuevo servicio</Button>
      </div>

      <div className="toolbar">
        <Field placeholder="Buscar servicio o categoría…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar servicios" />
      </div>

      {services.length === 0 ? (
        <EmptyState icon={<Blocks />} title="Sin servicios" text="Agrega los servicios que usas: Google Tag Manager, Supabase, Hetzner…" />
      ) : (
        grouped.map(([cat, list]) => (
          <section key={cat} className="svc-group">
            <div className="svc-group-head"><h3>{cat}</h3><span className="line" /></div>
            <div className="svc-table">
              {list.map((s) => (
                <div key={s.id} className="svc-row">
                  <LogoTile src={s.logo_url} name={s.name} size={40} />
                  <div className="svc-row-body">
                    <b>{s.name}</b>
                    <small>{s.login_url ?? "Sin URL de acceso"}</small>
                  </div>
                  <Badge>{KIND_LABEL[s.kind]}</Badge>
                  {s.login_url && (
                    <a className="bv-icon-btn" href={s.login_url} target="_blank" rel="noreferrer noopener" aria-label={`Abrir ${s.name}`}><ExternalLink /></a>
                  )}
                  <IconButton label="Editar" onClick={() => setDialog({ open: true, service: s })}><Pencil /></IconButton>
                  <IconButton label="Eliminar" onClick={() => setToDelete(s)}><Trash2 /></IconButton>
                </div>
              ))}
            </div>
          </section>
        ))
      )}

      <ServiceDialog open={dialog.open} service={dialog.service} onClose={() => setDialog({ open: false })} />
      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title="Eliminar servicio"
        message={<>Se quitará <b>{toDelete?.name}</b> del catálogo. Las credenciales que lo usan se conservan y quedan en “Otros”.</>}
        onConfirm={async () => {
          await deleteService(toDelete!.id);
          toast("Servicio eliminado");
          await reload();
        }}
      />
    </>
  );
}
