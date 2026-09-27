"use client";

import { useState, type ReactNode } from "react";
import { AlertTriangle, Lock, ShieldCheck } from "lucide-react";
import { useVault } from "@/lib/vault";
import { estimateStrength, WrongMasterPasswordError } from "@/lib/crypto";
import { signOut } from "@/lib/data";
import { Button, Field } from "@/components/ui";

export function VaultGate({ children }: { children: ReactNode }) {
  const { status, error } = useVault();
  if (status === "loading") return <div className="center-screen"><span className="spinner" /></div>;
  if (status === "error")
    return (
      <main className="gate">
        <div className="gate-card">
          <h1 className="display-md">No pudimos abrir la bóveda</h1>
          <p className="muted">{error}. Revisa que la migración de Supabase esté aplicada y tus variables de entorno.</p>
        </div>
      </main>
    );
  if (status === "setup") return <SetupScreen />;
  if (status === "locked") return <UnlockScreen />;
  return <>{children}</>;
}

function UnlockScreen() {
  const { unlock } = useVault();
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await unlock(pw);
    } catch (e) {
      setErr(e instanceof WrongMasterPasswordError ? e.message : "No se pudo desbloquear. Inténtalo de nuevo.");
      setPw("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="gate">
      <form className="gate-card" onSubmit={submit}>
        <div className="gate-mark"><Lock /></div>
        <div className="gate-dots" aria-hidden><i className="on" /><i className="on" /><i /></div>
        <div>
          <h1 className="display-md">Bóveda bloqueada</h1>
          <p className="muted" style={{ marginTop: 6 }}>Escribe tu contraseña maestra para descifrar tus credenciales en este navegador.</p>
        </div>
        <Field label="Contraseña maestra" type="password" autoComplete="current-password" autoFocus required value={pw} onChange={(e) => setPw(e.target.value)} error={err} />
        <Button type="submit" variant="primary" loading={busy}>Desbloquear</Button>
        <button type="button" className="bv-btn bv-btn-ghost bv-btn-sm" onClick={signOut}>
          Cerrar sesión
        </button>
      </form>
    </main>
  );
}

function SetupScreen() {
  const { setup } = useVault();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [ack, setAck] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const strength = estimateStrength(pw);
  const level = pw ? ["Débil", "Aceptable", "Fuerte", "Excelente"].indexOf(strength.label) + 1 : 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 12) return setErr("Usa al menos 12 caracteres.");
    if (pw !== pw2) return setErr("Las contraseñas no coinciden.");
    setBusy(true);
    setErr(null);
    try {
      await setup(pw);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="gate">
      <form className="gate-card" onSubmit={submit}>
        <div className="gate-mark"><ShieldCheck /></div>
        <div className="gate-dots" aria-hidden><i className="on" /><i className="on" /><i className="on" /></div>
        <div>
          <h1 className="display-md">Crea tu contraseña maestra</h1>
          <p className="muted" style={{ marginTop: 6 }}>Con ella se cifran todas tus credenciales antes de salir de tu navegador. Ni Supabase ni nadie más puede leerlas.</p>
        </div>
        <div className="bv-field">
          <Field label="Contraseña maestra" type="password" autoComplete="new-password" autoFocus required value={pw} onChange={(e) => setPw(e.target.value)} hint="Una frase larga es mejor que una palabra rara." />
          <div className="strength" aria-live="polite">
            {[1, 2, 3, 4].map((i) => <i key={i} className={i <= level ? "on" : undefined} />)}
            <span>{pw ? strength.label : ""}</span>
          </div>
        </div>
        <Field label="Confirmar" type="password" autoComplete="new-password" required value={pw2} onChange={(e) => setPw2(e.target.value)} error={err} />
        <div className="notice">
          <AlertTriangle />
          <span>Si la olvidas no hay forma de recuperar tus credenciales. Guárdala en un lugar seguro fuera de esta app.</span>
        </div>
        <label className="check">
          <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} />
          Entiendo que no se puede recuperar.
        </label>
        <Button type="submit" variant="primary" loading={busy} disabled={!ack}>Crear bóveda</Button>
      </form>
    </main>
  );
}
