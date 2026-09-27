"use client";

import { ArrowUpRight, ChevronDown, Copy, ExternalLink, KeyRound, Link2, Pencil, Trash2, TriangleAlert, User } from "lucide-react";
import type { Credential, Service } from "@/lib/types";
import { useVault } from "@/lib/vault";
import { Badge, IconButton, LogoTile, SecretField } from "@/components/ui";

const DAY = 86_400_000;

function ago(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / DAY);
  if (d <= 0) return "hoy";
  if (d === 1) return "ayer";
  if (d < 30) return `hace ${d} días`;
  const m = Math.floor(d / 30);
  return m === 1 ? "hace 1 mes" : `hace ${m} meses`;
}

export type Linked = { credential: Credential; service?: Service };

type Props = {
  credential: Credential;
  service?: Service;
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  /** Cuenta con la que se inicia sesión; "missing" si se borró. */
  via?: Linked | "missing";
  /** Credenciales que inician sesión con esta. */
  usedBy?: Linked[];
  onJump?: (id: string) => void;
};

const userOf = (c?: Credential) => c?.secret?.fields.find((f) => !f.secret && f.value);
const secretOf = (c?: Credential) => c?.secret?.fields.find((f) => f.secret && f.value);

export function CredentialCard({ credential: c, service, expanded, onToggle, onEdit, onDelete, via, usedBy = [], onJump }: Props) {
  const { copy } = useVault();
  const stale = Date.now() - new Date(c.last_rotated_at).getTime() > 90 * DAY;
  const fields = c.secret?.fields.filter((f) => f.value) ?? [];
  const linked = via && via !== "missing" ? via : undefined;
  // Con cuenta vinculada, los atajos copian el usuario y la contraseña de esa cuenta
  const user = fields.find((f) => !f.secret) ?? userOf(linked?.credential);
  const secret = fields.find((f) => f.secret) ?? secretOf(linked?.credential);
  const bodyId = `cb-${c.id}`;

  return (
    <article className={`bv-cred cred-tile ${expanded ? "is-open" : ""}`} id={`c-${c.id}`}>
      <div className="cred-tile-head">
        <button type="button" className="cred-tile-toggle" aria-expanded={expanded} aria-controls={bodyId} onClick={onToggle}>
          <LogoTile src={service?.logo_url} name={service?.name ?? c.title} size={44} />
          <span className="cred-tile-titles">
            <span className="cred-tile-title">{c.title}</span>
            <span className="cred-tile-sub">{service?.name ?? "Sin servicio"}</span>
            {!expanded && linked && (
              <span className="cred-tile-via"><Link2 aria-hidden /> con {linked.service?.name ?? linked.credential.title}{user ? ` · ${user.value}` : ""}</span>
            )}
            {!expanded && via === "missing" && <span className="cred-tile-via is-broken"><TriangleAlert aria-hidden /> Cuenta vinculada eliminada</span>}
            {!expanded && !via && user && <span className="cred-tile-user">{user.value}</span>}
          </span>
          <span className="cred-tile-meta">
            <Badge tone={c.environment} />
            {usedBy.length > 0 && <span className="cred-tile-links" title={`Se usa para entrar a ${usedBy.length} servicio(s)`}><Link2 aria-hidden />{usedBy.length}</span>}
            {stale && <span className="cred-tile-stale" title="Lleva más de 90 días sin rotarse" />}
          </span>
          <ChevronDown className="cred-tile-chevron" aria-hidden />
        </button>
        {!expanded && !c.decryptError && (
          <div className="cred-tile-quick">
            {user && <IconButton label={`Copiar ${user.label}`} onClick={() => copy(user.value, user.label)}><User /></IconButton>}
            {secret && <IconButton label={`Copiar ${secret.label}`} onClick={() => copy(secret.value, secret.label)}><KeyRound /></IconButton>}
          </div>
        )}
      </div>

      <div className="cred-tile-collapse" id={bodyId} hidden={!expanded}>
        <div className="cred-tile-inner">
          <div className="cred-tile-bar">
            <span className="bv-cred-sub">
              {c.login_url ? (
                <a href={c.login_url} target="_blank" rel="noreferrer noopener">Abrir login <ExternalLink size={11} style={{ verticalAlign: "-1px" }} /></a>
              ) : (
                <span className="faint">Sin URL de acceso</span>
              )}
            </span>
            <div className="cred-actions">
              {secret && <IconButton label={`Copiar ${secret.label}`} onClick={() => copy(secret.value, secret.label)}><Copy /></IconButton>}
              <IconButton label="Editar" onClick={onEdit}><Pencil /></IconButton>
              <IconButton label="Eliminar" onClick={onDelete}><Trash2 /></IconButton>
            </div>
          </div>
          {linked && (
            <div className="via-box">
              <span className="bv-label">Inicia sesión con</span>
              <button type="button" className="via-link" onClick={() => onJump?.(linked.credential.id)}>
                <LogoTile src={linked.service?.logo_url} name={linked.service?.name ?? linked.credential.title} size={36} />
                <span className="via-link-body">
                  <b>{linked.service?.name ?? "Cuenta"} · {linked.credential.title}</b>
                  <small>{userOf(linked.credential)?.value ?? "Sin usuario"}</small>
                </span>
                <span className="via-link-go">Ver cuenta <ArrowUpRight aria-hidden /></span>
              </button>
            </div>
          )}
          {via === "missing" && (
            <div className="via-box"><span className="cred-error" style={{ padding: 0 }}>La cuenta con la que se iniciaba sesión ya no existe. Edita esta credencial y elige otra.</span></div>
          )}
          {usedBy.length > 0 && (
            <div className="via-box">
              <span className="bv-label">Se usa para entrar a</span>
              <div className="used-by">
                {usedBy.map((u) => (
                  <button key={u.credential.id} type="button" className="chip" onClick={() => onJump?.(u.credential.id)}>
                    <LogoTile src={u.service?.logo_url} name={u.service?.name ?? u.credential.title} size={20} />
                    {u.service?.name ?? u.credential.title}
                  </button>
                ))}
              </div>
            </div>
          )}
          {c.decryptError ? (
            <div className="cred-error">No se pudo descifrar esta credencial. Puede estar dañada o haber sido cifrada con otra llave.</div>
          ) : (
            <div className="bv-cred-body">
              {fields.map((f, i) => <SecretField key={i} label={f.label} value={f.value} secret={f.secret} />)}
              {c.secret?.notes && <p className="bv-cred-notes">{c.secret.notes}</p>}
            </div>
          )}
          <footer className="bv-cred-foot">
            <span>Actualizada {ago(c.updated_at)} · rotada {ago(c.last_rotated_at)}</span>
            {stale && <span className="is-stale">Rotar pronto</span>}
          </footer>
        </div>
      </div>
    </article>
  );
}
