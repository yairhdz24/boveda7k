"use client";

import { useEffect, useState } from "react";
import { createService, updateService } from "@/lib/data";
import { normalizeUrl } from "@/lib/presets";
import { useVault } from "@/lib/vault";
import { KIND_LABEL, type Service, type ServiceKind } from "@/lib/types";
import { Button, Dialog, Field, Select } from "@/components/ui";
import { useData } from "@/components/Shell";
import { LogoPicker } from "./LogoPicker";

export function ServiceDialog({ open, onClose, service }: { open: boolean; onClose: () => void; service?: Service }) {
  const { toast } = useVault();
  const { reload } = useData();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [kind, setKind] = useState<ServiceKind>("login");
  const [loginUrl, setLoginUrl] = useState("");
  const [logo, setLogo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(service?.name ?? "");
    setCategory(service?.category ?? "");
    setKind(service?.kind ?? "login");
    setLoginUrl(service?.login_url ?? "");
    setLogo(service?.logo_url ?? null);
    setErr(null);
  }, [open, service]);

  async function save() {
    if (!name.trim()) return setErr("Escribe el nombre del servicio.");
    setBusy(true);
    try {
      const input = { name: name.trim(), category: category.trim() || null, kind, login_url: normalizeUrl(loginUrl), logo_url: logo };
      if (service) await updateService(service.id, input);
      else await createService(input);
      await reload();
      toast(service ? "Servicio actualizado" : "Servicio agregado");
      onClose();
    } catch (e) {
      const msg = (e as Error).message;
      toast(msg.includes("duplicate") ? "Ya tienes un servicio con ese nombre." : msg, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={service ? "Editar servicio" : "Nuevo servicio"}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" loading={busy} onClick={save}>{service ? "Guardar" : "Agregar servicio"}</Button>
        </>
      }
    >
      <Field label="Nombre" placeholder="Google Tag Manager" value={name} onChange={(e) => setName(e.target.value)} error={err} autoFocus />
      <div className="form-grid">
        <Field label="Categoría" placeholder="Analítica" value={category} onChange={(e) => setCategory(e.target.value)} />
        <Select label="Tipo de credencial" value={kind} onChange={(e) => setKind(e.target.value as ServiceKind)}>
          {(Object.keys(KIND_LABEL) as ServiceKind[]).map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
        </Select>
      </div>
      <Field label="URL de acceso" mono placeholder="https://tagmanager.google.com" value={loginUrl} onChange={(e) => setLoginUrl(e.target.value)} hint="Se sugiere al crear credenciales de este servicio." />
      <LogoPicker value={logo} onChange={setLogo} name={name} siteUrl={normalizeUrl(loginUrl)} />
    </Dialog>
  );
}
