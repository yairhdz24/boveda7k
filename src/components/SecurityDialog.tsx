"use client";

import { useState } from "react";
import { Fingerprint, Trash2 } from "lucide-react";
import { useVault } from "@/lib/vault";
import { WrongMasterPasswordError } from "@/lib/crypto";
import { PasskeyCancelledError } from "@/lib/passkey";
import { Button, Dialog, Field, IconButton } from "@/components/ui";

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" }) : "nunca");

/** Dispositivos que abren la bóveda con biometría: listar, agregar el actual y revocar. */
export function SecurityDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { passkeys, biometrics, devicePasskey, enrollPasskey, removePasskey, toast } = useVault();
  const [adding, setAdding] = useState(false);
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const close = () => {
    setAdding(false);
    setErr(null);
    setPw("");
    onClose();
  };

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await enrollPasskey(pw);
      toast(`${biometrics.name} activado en este dispositivo`);
      setAdding(false);
    } catch (e) {
      if (e instanceof WrongMasterPasswordError) setErr(e.message);
      else if (!(e instanceof PasskeyCancelledError)) setErr((e as Error).message);
    } finally {
      setPw("");
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    try {
      await removePasskey(id);
      toast("Dispositivo revocado");
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  return (
    <Dialog open={open} onClose={close} title="Seguridad">
      <div className="grid gap-4">
        <p className="m-0 text-muted-foreground">
          Dispositivos que pueden abrir tu bóveda con biometría. Cada uno guarda su propia llave cifrada; revocarlo aquí la invalida. Tu contraseña maestra siempre funciona.
        </p>
        {passkeys.length === 0 ? (
          <p className="m-0 text-faint">Aún no hay dispositivos registrados.</p>
        ) : (
          <ul className="m-0 grid list-none gap-2 p-0">
            {passkeys.map((p) => (
              <li key={p.id} className="flex items-center gap-3 rounded-md border border-solid border-border bg-raised py-2.5 pr-2 pl-3">
                <span className="grid size-9 flex-none place-items-center rounded-xl bg-accent-soft text-accent-ink"><Fingerprint aria-hidden className="size-[18px]" /></span>
                <span className="grid min-w-0 flex-1">
                  <b className="truncate text-sm/5 font-bold">{p.label}{p.credential_id === devicePasskey && <span className="ml-2 text-xs font-semibold text-accent-ink">Este dispositivo</span>}</b>
                  <small className="text-xs/4 text-muted-foreground">Alta {fmt(p.created_at)} · último uso {fmt(p.last_used_at)}</small>
                </span>
                <IconButton label={`Revocar ${p.label}`} onClick={() => revoke(p.id)}><Trash2 /></IconButton>
              </li>
            ))}
          </ul>
        )}
        {!biometrics.supported ? (
          <p className="m-0 text-faint">Este navegador o dispositivo no permite desbloqueo biométrico cifrado.</p>
        ) : adding ? (
          <form className="grid gap-3" onSubmit={add}>
            <Field label="Contraseña maestra" type="password" autoComplete="current-password" autoFocus required value={pw} onChange={(e) => setPw(e.target.value)} error={err} hint="Se pide una vez para entregarle la llave a este dispositivo." />
            <Button type="submit" variant="primary" icon={<Fingerprint />} loading={busy}>Activar {biometrics.name}</Button>
          </form>
        ) : devicePasskey ? null : (
          <Button icon={<Fingerprint />} onClick={() => setAdding(true)}>Agregar este dispositivo</Button>
        )}
      </div>
    </Dialog>
  );
}
