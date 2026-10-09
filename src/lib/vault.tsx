"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { createVault, rewrapVault, unlockVault, unwrapDekWithSecret, wrapDekWithSecret, PasskeyUnlockError, type VaultKeyRecord } from "./crypto";
import { currentUser, deletePasskey, getVaultKey, listPasskeys, replaceVaultKey, savePasskey, saveVaultKey, seedDefaultServices, touchPasskey } from "./data";
import { assertPasskey, biometricName, deviceLabel, passkeySupport, registerPasskey } from "./passkey";
import type { PasskeyRecord } from "./types";

type Status = "loading" | "setup" | "locked" | "unlocked" | "error";

type VaultCtx = {
  status: Status;
  error: string | null;
  dek: CryptoKey | null;
  setup: (master: string) => Promise<void>;
  unlock: (master: string) => Promise<void>;
  /** Comprueba la contraseña maestra sin desbloquear. */
  verifyMaster: (master: string) => Promise<void>;
  /** Dispositivos que pueden abrir la bóveda con biometría. */
  passkeys: PasskeyRecord[];
  biometrics: { supported: boolean; name: string };
  unlockWithPasskey: () => Promise<void>;
  enrollPasskey: (master: string) => Promise<void>;
  removePasskey: (id: string) => Promise<void>;
  lock: () => void;
  /** true si el usuario bloqueó a mano: no se lanza el prompt biométrico solo. */
  lockedByUser: boolean;
  changeMaster: (oldMaster: string, newMaster: string) => Promise<void>;
  copy: (value: string, label?: string) => Promise<void>;
  toast: (msg: string, tone?: "ok" | "error") => void;
};

const Ctx = createContext<VaultCtx | null>(null);

export const AUTO_LOCK_MS = 15 * 60 * 1000;
const CLIPBOARD_CLEAR_MS = 30 * 1000;

type Toast = { id: number; msg: string; tone: "ok" | "error" };

export function VaultProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);
  const [dek, setDek] = useState<CryptoKey | null>(null);
  const [record, setRecord] = useState<VaultKeyRecord | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [passkeys, setPasskeys] = useState<PasskeyRecord[]>([]);
  const [biometrics, setBiometrics] = useState({ supported: false, name: "biometría" });
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Si la migración de passkeys aún no está aplicada, la bóveda abre igual con contraseña maestra
    Promise.all([getVaultKey(), listPasskeys().catch(() => [] as PasskeyRecord[]), passkeySupport()])
      .then(([r, pk, supported]) => {
        setRecord(r);
        setPasskeys(pk);
        setBiometrics({ supported, name: biometricName() });
        setStatus(r ? "locked" : "setup");
      })
      .catch((e: Error) => {
        setError(e.message);
        setStatus("error");
      });
  }, []);

  const toast = useCallback((msg: string, tone: "ok" | "error" = "ok") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  const [lockedByUser, setLockedByUser] = useState(false);
  const lockAs = useCallback((byUser: boolean) => {
    setLockedByUser(byUser);
    setDek(null);
    setStatus((s) => (s === "unlocked" ? "locked" : s));
  }, []);
  const lock = useCallback(() => lockAs(true), [lockAs]);

  // Auto-bloqueo por inactividad
  useEffect(() => {
    if (status !== "unlocked") return;
    const reset = () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(() => lockAs(false), AUTO_LOCK_MS);
    };
    const events = ["pointerdown", "keydown", "scroll", "pointermove"] as const;
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      events.forEach((e) => window.removeEventListener(e, reset));
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [status, lockAs]);

  const setup = useCallback(async (master: string) => {
    const { record: r, dek: k } = await createVault(master);
    await saveVaultKey(r);
    await seedDefaultServices();
    setRecord(r);
    setDek(k);
    setStatus("unlocked");
  }, []);

  const unlock = useCallback(
    async (master: string) => {
      if (!record) throw new Error("No hay bóveda configurada.");
      const k = await unlockVault(master, record);
      setDek(k);
      setStatus("unlocked");
    },
    [record],
  );

  const verifyMaster = useCallback(
    async (master: string) => {
      if (!record) throw new Error("No hay bóveda configurada.");
      await unlockVault(master, record);
    },
    [record],
  );

  const unlockWithPasskey = useCallback(async () => {
    const { credentialId, secret } = await assertPasskey(passkeys);
    const row = passkeys.find((p) => p.credential_id === credentialId);
    if (!row) throw new PasskeyUnlockError();
    const k = await unwrapDekWithSecret(secret, row, credentialId);
    setDek(k);
    setStatus("unlocked");
    touchPasskey(row.id)
      .then(() => setPasskeys((p) => p.map((x) => (x.id === row.id ? { ...x, last_used_at: new Date().toISOString() } : x))))
      .catch(() => { /* solo es informativo */ });
  }, [passkeys]);

  const enrollPasskey = useCallback(
    async (master: string) => {
      if (!record) throw new Error("No hay bóveda configurada.");
      // Para envolverla hace falta la DEK extraíble: por eso se pide la contraseña maestra
      const extractable = await unlockVault(master, record, true);
      const { credentialId, prfSalt, secret } = await registerPasskey(await currentUser(), passkeys);
      const wrap = await wrapDekWithSecret(extractable, secret, credentialId);
      const row = await savePasskey({ credential_id: credentialId, prf_salt: prfSalt, ...wrap, label: deviceLabel() });
      setPasskeys((p) => [...p, row]);
    },
    [record, passkeys],
  );

  const removePasskey = useCallback(async (id: string) => {
    await deletePasskey(id);
    setPasskeys((p) => p.filter((x) => x.id !== id));
  }, []);

  const changeMaster = useCallback(
    async (oldMaster: string, newMaster: string) => {
      if (!record) return;
      const next = await rewrapVault(oldMaster, newMaster, record);
      await replaceVaultKey(next);
      setRecord(next);
    },
    [record],
  );

  const copy = useCallback(
    async (value: string, label = "Valor") => {
      try {
        await navigator.clipboard.writeText(value);
        navigator.vibrate?.(12);
        toast(`${label} copiado · se borra en 30 s`);
        if (clipTimer.current) clearTimeout(clipTimer.current);
        clipTimer.current = setTimeout(async () => {
          try {
            const current = await navigator.clipboard.readText().catch(() => value);
            if (current === value) await navigator.clipboard.writeText("");
          } catch {
            /* el navegador puede negar el acceso si la pestaña no tiene foco */
          }
        }, CLIPBOARD_CLEAR_MS);
      } catch {
        toast("No se pudo copiar. Revisa los permisos del navegador.", "error");
      }
    },
    [toast],
  );

  return (
    <Ctx.Provider value={{ status, error, dek, setup, unlock, verifyMaster, passkeys, biometrics, unlockWithPasskey, enrollPasskey, removePasskey, lock, lockedByUser, changeMaster, copy, toast }}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.tone === "error" ? "is-error" : ""}`}>
            {t.msg}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useVault() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useVault fuera de VaultProvider");
  return v;
}

/** Devuelve la DEK o lanza: úsalo solo dentro de vistas desbloqueadas. */
export function useDek(): CryptoKey {
  const { dek } = useVault();
  if (!dek) throw new Error("Bóveda bloqueada");
  return dek;
}
