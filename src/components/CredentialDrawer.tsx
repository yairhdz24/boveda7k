"use client";

import { useRef } from "react";
import { ArrowUpRight, ExternalLink, Pencil, Trash2, X } from "lucide-react";
import type { Credential, Service } from "@/lib/types";
import { Badge, Button, IconButton, LogoTile, SecretField } from "@/components/ui";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { DAY, userOf, type Linked } from "@/components/CredentialCard";

function ago(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / DAY);
  if (d <= 0) return "hoy";
  if (d === 1) return "ayer";
  if (d < 30) return `hace ${d} días`;
  const m = Math.floor(d / 30);
  return m === 1 ? "hace 1 mes" : `hace ${m} meses`;
}

type Shown = { credential: Credential; service?: Service; via?: Linked | "missing"; usedBy?: Linked[] };
type Props = Partial<Omit<Shown, "credential">> & {
  credential: Credential | null;
  onClose: () => void;
  onEdit: (c: Credential) => void;
  onDelete: (c: Credential) => void;
  onJump: (id: string) => void;
};

const section = "grid gap-2";

/** Panel lateral con el detalle de una credencial. Se abre cuando `credential` no es null. */
export function CredentialDrawer({ credential, service, via, usedBy, onClose, onEdit, onDelete, onJump }: Props) {
  // Se conserva lo último mostrado para que el contenido no desaparezca durante la animación de cierre
  const last = useRef<Shown | null>(null);
  if (credential) last.current = { credential, service, via, usedBy };
  const shown = last.current;

  const c = shown?.credential;
  const linked = shown?.via && shown.via !== "missing" ? shown.via : undefined;
  const fields = c?.secret?.fields.filter((f) => f.value) ?? [];
  const stale = c ? Date.now() - new Date(c.last_rotated_at).getTime() > 90 * DAY : false;

  return (
    <Sheet open={!!credential} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent aria-describedby={undefined}>
        {c && shown && (
          <>
            <header className="flex items-start gap-3.5 pt-3 pr-4 pb-3 pl-5 desk:pt-5.5">
              <LogoTile src={shown.service?.logo_url} name={shown.service?.name ?? c.title} size={52} />
              <div className="grid min-w-0 flex-1 gap-0.5">
                <SheetTitle>{c.title}</SheetTitle>
                <SheetDescription>{shown.service?.name ?? "Sin servicio"}</SheetDescription>
              </div>
              <SheetClose asChild><IconButton label="Cerrar"><X /></IconButton></SheetClose>
            </header>
            <div className="flex flex-wrap items-center gap-2.5 border-0 border-b border-solid border-border px-5 pb-4 text-xs/4 font-semibold">
              <Badge tone={c.environment} />
              {stale && <span className="font-bold text-warning">Rotar pronto</span>}
              {c.login_url ? (
                <a className="ml-auto inline-flex items-center gap-1 font-bold text-accent-ink no-underline hover:underline" href={c.login_url} target="_blank" rel="noreferrer noopener">
                  Abrir login <ExternalLink aria-hidden className="size-3" />
                </a>
              ) : (
                <span className="ml-auto text-faint">Sin URL de acceso</span>
              )}
            </div>

            <div key={c.id} className="grid flex-1 content-start gap-5.5 overflow-y-auto overscroll-contain px-5 py-5">
              {linked && (
                <section className={section}>
                  <span className="bv-label">Inicia sesión con</span>
                  <button type="button" className="via-link" onClick={() => onJump(linked.credential.id)}>
                    <LogoTile src={linked.service?.logo_url} name={linked.service?.name ?? linked.credential.title} size={36} />
                    <span className="via-link-body">
                      <b>{linked.service?.name ?? "Cuenta"} · {linked.credential.title}</b>
                      <small>{userOf(linked.credential)?.value ?? "Sin usuario"}</small>
                    </span>
                    <span className="via-link-go">Ver cuenta <ArrowUpRight aria-hidden /></span>
                  </button>
                </section>
              )}
              {shown.via === "missing" && <p className="m-0 text-[13px]/[18px] font-semibold text-destructive">La cuenta con la que se iniciaba sesión ya no existe. Edita esta credencial y elige otra.</p>}

              {c.decryptError ? (
                <p className="m-0 text-[13px]/[18px] font-semibold text-destructive">No se pudo descifrar esta credencial. Puede estar dañada o haber sido cifrada con otra llave.</p>
              ) : (
                (fields.length > 0 || c.secret?.notes || !linked) && (
                  <section className="grid gap-4">
                    {fields.map((f, i) => <SecretField key={i} label={f.label} value={f.value} secret={f.secret} />)}
                    {fields.length === 0 && !c.secret?.notes && <p className="m-0 text-faint">Esta credencial no tiene campos.</p>}
                    {c.secret?.notes && <p className="m-0 text-sm/[21px] whitespace-pre-wrap text-muted-foreground">{c.secret.notes}</p>}
                  </section>
                )
              )}

              {(shown.usedBy?.length ?? 0) > 0 && (
                <section className={section}>
                  <span className="bv-label">Se usa para entrar a</span>
                  <div className="used-by">
                    {shown.usedBy!.map((u) => (
                      <button key={u.credential.id} type="button" className="chip" onClick={() => onJump(u.credential.id)}>
                        <LogoTile src={u.service?.logo_url} name={u.service?.name ?? u.credential.title} size={20} />
                        {u.service?.name ?? u.credential.title}
                      </button>
                    ))}
                  </div>
                </section>
              )}
            </div>

            <footer className="flex flex-wrap items-center justify-between gap-3 border-0 border-t border-solid border-border bg-raised py-3 pr-4 pl-5 text-xs/4 text-faint">
              <span>Actualizada {ago(c.updated_at)} · rotada {ago(c.last_rotated_at)}</span>
              <div className="flex gap-1.5">
                <Button size="sm" icon={<Pencil />} onClick={() => onEdit(c)}>Editar</Button>
                <Button size="sm" variant="ghost" icon={<Trash2 />} onClick={() => onDelete(c)}>Eliminar</Button>
              </div>
            </footer>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
