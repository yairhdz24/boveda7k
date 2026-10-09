"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { AlertTriangle, Fingerprint, Lock, ShieldCheck } from "lucide-react";
import { useVault } from "@/lib/vault";
import { estimateStrength, WrongMasterPasswordError } from "@/lib/crypto";
import { PasskeyCancelledError } from "@/lib/passkey";
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

const OFFER_KEY = "bv-passkey-offer";
const offerDismissed = () => {
  try { return localStorage.getItem(OFFER_KEY) === "no"; } catch { return true; }
};

function UnlockScreen() {
  const { unlock, verifyMaster, unlockWithPasskey, enrollPasskey, passkeys, biometrics, lockedByUser, toast } = useVault();
  const hasPasskey = biometrics.supported && passkeys.length > 0;
  const [mode, setMode] = useState<"passkey" | "master" | "offer">(hasPasskey ? "passkey" : "master");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const tried = useRef(false);

  const withPasskey = useCallback(async () => {
    setBusy(true);
    setErr(null);
    try {
      await unlockWithPasskey();
    } catch (e) {
      // Cancelar no es un error: el botón sigue ahí
      if (!(e instanceof PasskeyCancelledError)) setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [unlockWithPasskey]);

  // Lanza el prompt una sola vez al aparecer la pantalla (no si el usuario acaba de bloquear a mano).
  // Si el navegador exige un gesto, falla en silencio y queda el botón.
  useEffect(() => {
    if (!hasPasskey || lockedByUser || tried.current) return;
    tried.current = true;
    withPasskey();
  }, [hasPasskey, lockedByUser, withPasskey]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      if (biometrics.supported && passkeys.length === 0 && !offerDismissed()) {
        await verifyMaster(pw);
        setMode("offer");
      } else {
        await unlock(pw);
      }
    } catch (e) {
      setErr(e instanceof WrongMasterPasswordError ? e.message : "No se pudo desbloquear. Inténtalo de nuevo.");
      setPw("");
    } finally {
      setBusy(false);
    }
  }

  /** Activa (o no) la biometría con la contraseña recién tecleada y abre la bóveda. */
  async function finishOffer(activate: boolean) {
    setBusy(true);
    try {
      if (activate) {
        await enrollPasskey(pw);
        toast(`${biometrics.name} activado en este dispositivo`);
      } else {
        try { localStorage.setItem(OFFER_KEY, "no"); } catch { /* sin almacenamiento */ }
      }
    } catch (e) {
      if (!(e instanceof PasskeyCancelledError)) toast((e as Error).message, "error");
    }
    try {
      await unlock(pw);
    } catch {
      setErr("No se pudo desbloquear. Inténtalo de nuevo.");
      setPw("");
      setMode("master");
    } finally {
      setBusy(false);
    }
  }

  if (mode === "offer")
    return (
      <main className="gate">
        <div className="gate-card">
          <div className="gate-mark"><Fingerprint /></div>
          <div className="gate-dots" aria-hidden><i className="on" /><i className="on" /><i className="on" /></div>
          <div>
            <h1 className="display-md">¿Desbloquear con {biometrics.name}?</h1>
            <p className="muted" style={{ marginTop: 6 }}>La próxima vez abre tu bóveda sin escribir la contraseña maestra. La llave se guarda cifrada y solo este dispositivo puede abrirla.</p>
          </div>
          <Button variant="primary" icon={<Fingerprint />} loading={busy} onClick={() => finishOffer(true)}>Activar {biometrics.name}</Button>
          <button type="button" className="bv-btn bv-btn-ghost bv-btn-sm" disabled={busy} onClick={() => finishOffer(false)}>Ahora no</button>
        </div>
      </main>
    );

  return (
    <main className="gate">
      <form className="gate-card" onSubmit={submit}>
        <div className="gate-mark">{mode === "passkey" ? <Fingerprint /> : <Lock />}</div>
        <div className="gate-dots" aria-hidden><i className="on" /><i className="on" /><i /></div>
        <div>
          <h1 className="display-md">Bóveda bloqueada</h1>
          <p className="muted" style={{ marginTop: 6 }}>
            {mode === "passkey" ? `Usa ${biometrics.name} para descifrar tus credenciales en este dispositivo.` : "Escribe tu contraseña maestra para descifrar tus credenciales en este navegador."}
          </p>
        </div>
        {mode === "passkey" ? (
          <>
            <Button variant="primary" icon={<Fingerprint />} loading={busy} onClick={withPasskey} autoFocus>Desbloquear con {biometrics.name}</Button>
            {err && <div className="bv-error" role="alert">{err}</div>}
            <button type="button" className="bv-btn bv-btn-ghost bv-btn-sm" onClick={() => { setErr(null); setMode("master"); }}>Usar contraseña maestra</button>
          </>
        ) : (
          <>
            <Field label="Contraseña maestra" type="password" autoComplete="current-password" autoFocus required value={pw} onChange={(e) => setPw(e.target.value)} error={err} />
            <Button type="submit" variant="primary" loading={busy}>Desbloquear</Button>
            {hasPasskey && <button type="button" className="bv-btn bv-btn-ghost bv-btn-sm" onClick={() => { setErr(null); setMode("passkey"); }}>Usar {biometrics.name}</button>}
          </>
        )}
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
