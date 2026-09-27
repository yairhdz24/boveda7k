"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Button, Field } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabaseBrowser().auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      setError("Correo o contraseña incorrectos.");
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <main className="gate">
      <form className="gate-card" onSubmit={submit}>
        <div className="gate-mark"><KeyRound /></div>
        <div className="gate-dots" aria-hidden><i className="on" /><i /><i /></div>
        <div>
          <h1 className="display-md">Entrar a Bóveda</h1>
          <p className="muted" style={{ marginTop: 6 }}>Inicia sesión con tu cuenta. Después te pediremos tu contraseña maestra.</p>
        </div>
        <Field label="Correo" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com" autoFocus />
        <Field label="Contraseña de la cuenta" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} error={error} />
        <Button type="submit" variant="primary" loading={busy}>Entrar</Button>
      </form>
    </main>
  );
}
