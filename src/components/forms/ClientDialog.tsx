"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient, updateClient } from "@/lib/data";
import { normalizeUrl } from "@/lib/presets";
import { useVault } from "@/lib/vault";
import type { Client } from "@/lib/types";
import { Button, Dialog, Field, TextArea } from "@/components/ui";
import { useData } from "@/components/Shell";
import { LogoPicker } from "./LogoPicker";

export function ClientDialog({ open, onClose, client }: { open: boolean; onClose: () => void; client?: Client }) {
  const router = useRouter();
  const { toast } = useVault();
  const { reload } = useData();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [logo, setLogo] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(client?.name ?? "");
    setUrl(client?.website_url ?? "");
    setLogo(client?.logo_url ?? null);
    setNotes(client?.notes ?? "");
    setErr(null);
  }, [open, client]);

  async function save() {
    if (!name.trim()) return setErr("Escribe el nombre del cliente.");
    setBusy(true);
    try {
      const input = { name: name.trim(), website_url: normalizeUrl(url), logo_url: logo, notes: notes.trim() || null };
      if (client) {
        await updateClient(client.id, input);
        toast("Cliente actualizado");
      } else {
        const c = await createClient(input);
        toast("Cliente creado");
        router.push(`/clientes/${c.id}`);
      }
      await reload();
      onClose();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={client ? "Editar cliente" : "Nuevo cliente"}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" loading={busy} onClick={save}>{client ? "Guardar cambios" : "Crear cliente"}</Button>
        </>
      }
    >
      <Field label="Nombre" placeholder="Nombre Cliente" value={name} onChange={(e) => setName(e.target.value)} error={err} autoFocus />
      <Field label="Sitio web" placeholder="cliente.com" mono value={url} onChange={(e) => setUrl(e.target.value)} hint="La página del cliente o la que le estás desarrollando." />
      <LogoPicker value={logo} onChange={setLogo} name={name} siteUrl={normalizeUrl(url)} />
      <TextArea label="Notas" placeholder="Contacto, alcance del proyecto…" value={notes} onChange={(e) => setNotes(e.target.value)} hint="Las notas del cliente no se cifran; los secretos van en credenciales." />
    </Dialog>
  );
}
