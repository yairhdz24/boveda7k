"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { createVault, rewrapVault, unlockVault, type VaultKeyRecord } from "./crypto";
import { getVaultKey, replaceVaultKey, saveVaultKey, seedDefaultServices } from "./data";

type Status = "loading" | "setup" | "locked" | "unlocked" | "error";

type VaultCtx = {
  status: Status;
  error: string | null;
  dek: CryptoKey | null;
  setup: (master: string) => Promise<void>;
  unlock: (master: string) => Promise<void>;
  lock: () => void;
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
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    getVaultKey()
      .then((r) => {
        setRecord(r);
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

  const lock = useCallback(() => {
    setDek(null);
    setStatus((s) => (s === "unlocked" ? "locked" : s));
  }, []);

  // Auto-bloqueo por inactividad
  useEffect(() => {
    if (status !== "unlocked") return;
    const reset = () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(lock, AUTO_LOCK_MS);
    };
    const events = ["pointerdown", "keydown", "scroll", "pointermove"] as const;
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      events.forEach((e) => window.removeEventListener(e, reset));
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [status, lock]);

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
    <Ctx.Provider value={{ status, error, dek, setup, unlock, lock, changeMaster, copy, toast }}>
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
