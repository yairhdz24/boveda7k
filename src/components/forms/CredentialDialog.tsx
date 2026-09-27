"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Eye, EyeOff, GripVertical, KeyRound, Link2, Lock, LockOpen, Plus, Trash2, Wand2 } from "lucide-react";
import { saveCredential } from "@/lib/data";
import { generatePassword } from "@/lib/crypto";
import { normalizeUrl } from "@/lib/presets";
import { useDek, useVault } from "@/lib/vault";
import { ENV_LABEL, FIELD_TEMPLATES, type Credential, type Env, type SecretField } from "@/lib/types";
import { Button, Dialog, Field, IconButton, LogoTile, TextArea } from "@/components/ui";
import { useData } from "@/components/Shell";

type Props = { open: boolean; onClose: () => void; clientId: string; credential?: Credential; onSaved: () => void; siblings?: Credential[] };

export function CredentialDialog({ open, onClose, clientId, credential, onSaved, siblings = [] }: Props) {
  const dek = useDek();
  const { toast } = useVault();
  const { services, serviceById } = useData();

  const [serviceId, setServiceId] = useState<string | null>(null);
  const [svcQuery, setSvcQuery] = useState("");
  const [title, setTitle] = useState("");
  const [env, setEnv] = useState<Env>("prod");
  const [loginUrl, setLoginUrl] = useState("");
  const [fields, setFields] = useState<SecretField[]>([]);
  const [notes, setNotes] = useState("");
  const [rotated, setRotated] = useState(false);
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [visible, setVisible] = useState<Record<number, boolean>>({});
  const [drag, setDrag] = useState<{ from: number; over: number } | null>(null);
  const [via, setVia] = useState<string | null>(null);
  const [useVia, setUseVia] = useState(false);

  useEffect(() => {
    if (!open) return;
    setServiceId(credential?.service_id ?? null);
    setTitle(credential?.title ?? "");
    setEnv(credential?.environment ?? "prod");
    setLoginUrl(credential?.login_url ?? "");
    setFields(credential?.secret?.fields.map((f) => ({ ...f })) ?? FIELD_TEMPLATES.login.map((f) => ({ ...f })));
    setNotes(credential?.secret?.notes ?? "");
    setRotated(false);
    setTouched(!!credential);
    setSvcQuery("");
    setErr(null);
    setVisible({});
    setVia(credential?.secret?.via ?? null);
    setUseVia(!!credential?.secret?.via);
  }, [open, credential]);

  /** Cuentas con las que se puede iniciar sesión: las del cliente que tienen su propio acceso. Correo primero. */
  const providers = useMemo(() => {
    const rank = (c: Credential) => (serviceById(c.service_id)?.kind === "email" ? 0 : 1);
    return siblings
      .filter((c) => c.id !== credential?.id && !c.secret?.via && !c.decryptError)
      .sort((a, b) => rank(a) - rank(b) || a.title.localeCompare(b.title));
  }, [siblings, credential, serviceById]);

  function setMode(linked: boolean) {
    setUseVia(linked);
    if (!touched) {
      // Con cuenta vinculada no hace falta usuario ni contraseña propios: solo campos extra opcionales
      setFields(linked ? [] : FIELD_TEMPLATES[serviceById(serviceId)?.kind ?? "login"].map((f) => ({ ...f })));
    }
    if (linked && !via && providers.length === 1) setVia(providers[0].id);
  }

  const filtered = useMemo(() => {
    const t = svcQuery.trim().toLowerCase();
    return services.filter((s) => !t || s.name.toLowerCase().includes(t) || s.category?.toLowerCase().includes(t));
  }, [services, svcQuery]);

  function pickService(id: string) {
    setServiceId(id);
    const svc = serviceById(id);
    if (!svc) return;
    if (!touched && !useVia) setFields(FIELD_TEMPLATES[svc.kind].map((f) => ({ ...f })));
    if (!loginUrl && svc.login_url) setLoginUrl(svc.login_url);
    if (!title) setTitle(ENV_LABEL[env] === "Producción" ? "Cuenta principal" : `Cuenta ${ENV_LABEL[env]}`);
  }

  const update = (i: number, patch: Partial<SecretField>) => {
    setTouched(true);
    setFields((fs) => fs.map((f, j) => (j === i ? { ...f, ...patch } : f)));
  };

  /** Reordena los campos; el estado "mostrar" de cada uno viaja con él. */
  const move = (from: number, to: number) => {
    if (to < 0 || to >= fields.length || from === to) return;
    const order = fields.map((_, i) => i);
    order.splice(to, 0, order.splice(from, 1)[0]);
    setTouched(true);
    setFields(order.map((i) => fields[i]));
    setVisible(Object.fromEntries(order.map((old, i) => [i, !!visible[old]])));
  };
  const remove = (i: number) => {
    const order = fields.map((_, j) => j).filter((j) => j !== i);
    setTouched(true);
    setFields(order.map((j) => fields[j]));
    setVisible(Object.fromEntries(order.map((old, j) => [j, !!visible[old]])));
  };

  async function save() {
    if (!title.trim()) return setErr("Ponle un título, por ejemplo “Cuenta principal”.");
    if (useVia && !via) return toast("Elige con qué cuenta se inicia sesión.", "error");
    setBusy(true);
    try {
      await saveCredential(
        dek,
        {
          client_id: clientId,
          service_id: serviceId,
          title: title.trim(),
          environment: env,
          login_url: normalizeUrl(loginUrl),
          secret: { fields: fields.filter((f) => f.label.trim() || f.value), notes: notes.trim() || undefined, via: useVia && via ? via : undefined },
          rotated,
        },
        credential?.id,
      );
      toast(credential ? "Credencial actualizada" : "Credencial guardada y cifrada");
      onSaved();
      onClose();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  const svc = serviceById(serviceId);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      wide
      title={credential ? "Editar credencial" : "Nueva credencial"}
      footer={
        <>
          {credential && (
            <label className="check" style={{ marginRight: "auto", alignSelf: "center" }}>
              <input type="checkbox" checked={rotated} onChange={(e) => setRotated(e.target.checked)} />
              La acabo de rotar
            </label>
          )}
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" icon={<Lock />} loading={busy} onClick={save}>Guardar cifrado</Button>
        </>
      }
    >
      <div className="bv-field">
        <span className="bv-label">Servicio</span>
        {svc && !svcQuery ? (
          <div className="logo-picker">
            <LogoTile src={svc.logo_url} name={svc.name} size={44} />
            <div style={{ flex: 1 }}>
              <b>{svc.name}</b>
              <div className="muted" style={{ fontSize: 12 }}>{svc.category}</div>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setSvcQuery(" ")}>Cambiar</Button>
          </div>
        ) : (
          <>
            <Field placeholder="Buscar servicio: Supabase, Gmail, Hetzner…" value={svcQuery.trimStart()} onChange={(e) => setSvcQuery(e.target.value)} autoFocus />
            <div className="service-picker">
              {filtered.map((s) => (
                <button key={s.id} type="button" className={`service-opt ${s.id === serviceId ? "is-on" : ""}`} onClick={() => { pickService(s.id); setSvcQuery(""); }}>
                  <LogoTile src={s.logo_url} name={s.name} size={28} />
                  <span>{s.name}</span>
                </button>
              ))}
            </div>
            <span className="bv-hint">¿No está? Agrégalo en Servicios con su logo.</span>
          </>
        )}
      </div>

      <div className="bv-field">
        <span className="bv-label">Cómo se inicia sesión</span>
        <div className="segmented access-mode" role="radiogroup" aria-label="Cómo se inicia sesión">
          <button type="button" role="radio" aria-checked={!useVia} className={!useVia ? "is-on" : undefined} onClick={() => setMode(false)}><KeyRound /> Usuario y contraseña</button>
          <button type="button" role="radio" aria-checked={useVia} className={useVia ? "is-on" : undefined} onClick={() => setMode(true)}><Link2 /> Con otra cuenta</button>
        </div>
        {useVia && (
          providers.length === 0 ? (
            <span className="bv-hint">Este cliente aún no tiene otra cuenta guardada. Primero agrega su cuenta de Google, Microsoft o GitHub como credencial.</span>
          ) : (
            <>
              <div className="provider-picker">
                {providers.map((p) => {
                  const ps = serviceById(p.service_id);
                  const user = p.secret?.fields.find((x) => !x.secret && x.value)?.value;
                  return (
                    <button key={p.id} type="button" className={`provider-opt ${via === p.id ? "is-on" : ""}`} onClick={() => setVia(p.id)} aria-pressed={via === p.id}>
                      <LogoTile src={ps?.logo_url} name={ps?.name ?? p.title} size={36} />
                      <span className="provider-opt-body">
                        <b>{ps?.name ?? p.title}</b>
                        <small>{user ?? p.title}</small>
                      </span>
                    </button>
                  );
                })}
              </div>
              <span className="bv-hint">Se usa el correo y la contraseña de esa cuenta. Si la cambias allá, aquí queda al día.</span>
            </>
          )
        )}
      </div>

      <div className="form-grid">
        <Field label="Título" placeholder="Cuenta principal" value={title} onChange={(e) => setTitle(e.target.value)} error={err} />
        <div className="bv-field">
          <span className="bv-label">Entorno</span>
          <div className="segmented" role="radiogroup" aria-label="Entorno">
            {(["prod", "staging", "dev"] as Env[]).map((e) => (
              <button key={e} type="button" role="radio" aria-checked={env === e} className={env === e ? "is-on" : undefined} onClick={() => setEnv(e)}>
                {ENV_LABEL[e]}
              </button>
            ))}
          </div>
        </div>
        <Field className="span-2" label="URL de acceso" mono placeholder="https://…" value={loginUrl} onChange={(e) => setLoginUrl(e.target.value)} />
      </div>

      <div className="fields-box">
        <div className="fields-box-head">
          <span className="bv-label">{useVia ? "Campos extra (opcional) · ID de proyecto, llaves…" : "Campos · se cifran en tu navegador"}</span>
          <Button size="sm" variant="ghost" icon={<Plus />} onClick={() => { setTouched(true); setFields((f) => [...f, { label: "", value: "", secret: true }]); }}>
            Campo
          </Button>
        </div>
        {fields.map((f, i) => {
          const multiline = /llave privada|private key|connection|códigos/i.test(f.label);
          return (
            <div
              key={i}
              className={`field-row is-sortable ${drag?.from === i ? "is-dragging" : ""} ${drag && drag.over === i && drag.from !== i ? (drag.from < i ? "drop-after" : "drop-before") : ""}`}
              onDragOver={(e) => { if (!drag) return; e.preventDefault(); e.dataTransfer.dropEffect = "move"; if (drag.over !== i) setDrag({ ...drag, over: i }); }}
              onDrop={(e) => { e.preventDefault(); if (drag) move(drag.from, i); setDrag(null); }}
            >
              <div className="field-order">
                <span
                  className="field-grip"
                  draggable
                  title="Arrastra para mover"
                  aria-hidden
                  onDragStart={(e) => {
                    const row = (e.currentTarget as HTMLElement).closest(".field-row") as HTMLElement | null;
                    if (row) e.dataTransfer.setDragImage(row, 24, 24);
                    e.dataTransfer.effectAllowed = "move";
                    e.dataTransfer.setData("text/plain", String(i));
                    setDrag({ from: i, over: i });
                  }}
                  onDragEnd={() => setDrag(null)}
                >
                  <GripVertical />
                </span>
                <IconButton label="Subir campo" onClick={() => move(i, i - 1)} disabled={i === 0}><ChevronUp /></IconButton>
                <IconButton label="Bajar campo" onClick={() => move(i, i + 1)} disabled={i === fields.length - 1}><ChevronDown /></IconButton>
              </div>
              <Field placeholder="Etiqueta" value={f.label} onChange={(e) => update(i, { label: e.target.value })} aria-label="Etiqueta del campo" />
              {multiline && f.secret && visible[i] ? (
                <TextArea mono placeholder="Valor" value={f.value} onChange={(e) => update(i, { value: e.target.value })} aria-label={f.label || "Valor"} />
              ) : (
                <Field
                  mono
                  placeholder="Valor"
                  aria-label={f.label || "Valor"}
                  type={f.secret && !visible[i] ? "password" : "text"}
                  autoComplete="off"
                  value={f.value}
                  onChange={(e) => update(i, { value: e.target.value })}
                  trailing={
                    f.secret ? (
                      <>
                        <IconButton label="Generar contraseña" onClick={() => { update(i, { value: generatePassword(24) }); setVisible((v) => ({ ...v, [i]: true })); }}><Wand2 /></IconButton>
                        <IconButton label={visible[i] ? "Ocultar" : "Mostrar"} onClick={() => setVisible((v) => ({ ...v, [i]: !v[i] }))}>{visible[i] ? <EyeOff /> : <Eye />}</IconButton>
                      </>
                    ) : undefined
                  }
                />
              )}
              <div style={{ display: "flex", gap: 2 }}>
                <IconButton label={f.secret ? "Marcar como no secreto" : "Marcar como secreto"} active={f.secret} onClick={() => update(i, { secret: !f.secret })}>
                  {f.secret ? <Lock /> : <LockOpen />}
                </IconButton>
                <IconButton label="Quitar campo" onClick={() => remove(i)}><Trash2 /></IconButton>
              </div>
            </div>
          );
        })}
      </div>

      <TextArea label="Notas (cifradas)" placeholder="Quién la compartió, 2FA ligado a qué número, fecha de entrega…" value={notes} onChange={(e) => setNotes(e.target.value)} />
    </Dialog>
  );
}
