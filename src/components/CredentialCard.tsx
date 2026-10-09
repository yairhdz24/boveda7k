"use client";

import { KeyRound, Link2, TriangleAlert, User } from "lucide-react";
import type { Credential, Service } from "@/lib/types";
import { useVault } from "@/lib/vault";
import { cn } from "@/lib/cn";
import { Badge, IconButton, LogoTile } from "@/components/ui";

export const DAY = 86_400_000;
export type Linked = { credential: Credential; service?: Service };

export const userOf = (c?: Credential) => c?.secret?.fields.find((f) => !f.secret && f.value);
export const secretOf = (c?: Credential) => c?.secret?.fields.find((f) => f.secret && f.value);

type Props = {
  credential: Credential;
  service?: Service;
  selected: boolean;
  onOpen: () => void;
  /** Cuenta con la que se inicia sesión; "missing" si se borró. */
  via?: Linked | "missing";
  /** Credenciales que inician sesión con esta. */
  usedBy?: Linked[];
};

/** Tarjeta compacta: el detalle completo se abre en el panel lateral (CredentialDrawer). */
export function CredentialCard({ credential: c, service, selected, onOpen, via, usedBy = [] }: Props) {
  const { copy } = useVault();
  const stale = Date.now() - new Date(c.last_rotated_at).getTime() > 90 * DAY;
  const linked = via && via !== "missing" ? via : undefined;
  // Con cuenta vinculada, los atajos copian el usuario y la contraseña de esa cuenta
  const user = userOf(c) ?? userOf(linked?.credential);
  const secret = secretOf(c) ?? secretOf(linked?.credential);

  return (
    <article
      id={`c-${c.id}`}
      onClick={onOpen}
      className={cn(
        "flex min-w-0 scroll-mt-[120px] cursor-pointer flex-col overflow-hidden rounded-lg border border-solid border-border bg-card transition-[border-color,box-shadow,translate] duration-150",
        "hover:-translate-y-px hover:border-border-strong",
        selected && "border-primary/45 shadow-[0_0_0_1px_color-mix(in_srgb,var(--accent)_20%,transparent)] hover:border-primary/45",
      )}
    >
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={(e) => { e.stopPropagation(); onOpen(); }}
        className="flex flex-1 cursor-pointer items-start gap-3 rounded-t-lg border-0 bg-transparent px-3.5 pt-3.5 pb-2.5 text-left text-inherit focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
      >
        <LogoTile src={service?.logo_url} name={service?.name ?? c.title} size={44} />
        <span className="grid min-w-0 flex-1 gap-0.5">
          <span className="line-clamp-2 text-[15px]/5 font-bold text-foreground wrap-anywhere">{c.title}</span>
          <span className="truncate text-xs/4 font-semibold text-muted-foreground">{service?.name ?? "Sin servicio"}</span>
        </span>
      </button>
      <div className="flex min-h-12 items-center gap-2 border-0 border-t border-solid border-border py-1.5 pr-2 pl-3.5">
        <span className="grid min-w-0 flex-1">
          {c.decryptError ? (
            <span className="cred-tile-via is-broken"><TriangleAlert aria-hidden /> No se pudo descifrar</span>
          ) : linked ? (
            <span className="cred-tile-via"><Link2 aria-hidden /> con {linked.service?.name ?? linked.credential.title}</span>
          ) : via === "missing" ? (
            <span className="cred-tile-via is-broken"><TriangleAlert aria-hidden /> Cuenta vinculada eliminada</span>
          ) : user ? (
            <span className="truncate font-mono text-xs/4 font-normal text-faint">{user.value}</span>
          ) : null}
        </span>
        <span className="flex flex-none items-center gap-2">
          {usedBy.length > 0 && <span className="cred-tile-links" title={`Se usa para entrar a ${usedBy.length} servicio(s)`}><Link2 aria-hidden />{usedBy.length}</span>}
          {stale && <span className="size-2 rounded-full bg-warning shadow-[0_0_0_3px_color-mix(in_srgb,var(--warning)_20%,transparent)]" title="Lleva más de 90 días sin rotarse" />}
          <Badge tone={c.environment} />
        </span>
        {!c.decryptError && (user || secret) && (
          <span className="cred-tile-quick flex flex-none gap-0.5" onClick={(e) => e.stopPropagation()}>
            {user && <IconButton label={`Copiar ${user.label}`} onClick={() => copy(user.value, user.label)}><User /></IconButton>}
            {secret && <IconButton label={`Copiar ${secret.label}`} onClick={() => copy(secret.value, secret.label)}><KeyRound /></IconButton>}
          </span>
        )}
      </div>
    </article>
  );
}
