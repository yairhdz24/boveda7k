# Panel lateral, biometría y open source: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que las credenciales se abran en un panel lateral sin títulos cortados, que la bóveda se desbloquee con Touch ID / Face ID, y que el repositorio quede listo para la comunidad con README bilingüe y capturas.

**Architecture:** La biometría añade una segunda envoltura de la misma DEK: una passkey WebAuthn con extensión PRF entrega un secreto, HKDF lo convierte en una KEK por dispositivo y la DEK envuelta se guarda en `vault_passkeys`. La lógica criptográfica vive en `crypto.ts` (pura, probada en Node), todo `navigator.credentials` vive en `passkey.ts`, y `vault.tsx` orquesta. El panel lateral es un `<dialog>` modal alimentado por `selected` en la página de cliente.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, Supabase (Auth + Postgres con RLS), Web Crypto, WebAuthn PRF, CSS propio (Design System Bóveda), lucide-react.

**Spec:** `docs/superpowers/specs/2026-10-09-drawer-biometria-open-source-design.md`

## Global Constraints

- Rama de trabajo: `feat/drawer-biometria-oss`. No hacer `git push` sin confirmación de Yair.
- Sin Tailwind ni shadcn: se usan las clases y tokens existentes (`src/app/tokens.css`, `src/app/app.css`). Sin dependencias nuevas en `package.json`.
- Toda la interfaz en español; nombre del producto: **Bóveda**.
- Comentarios y estilo como el código vecino: comentarios breves en español, líneas largas permitidas, comillas dobles.
- HKDF `info = "boveda:passkey-kek:v1"`; AAD de la envoltura `"boveda:dek:passkey:v1:" + credential_id`.
- Auto-bloqueo se queda en 15 min (`AUTO_LOCK_MS`).
- Nada del proyecto Supabase de Yair (ref, URL, llaves, correos reales) entra al repositorio.
- Acciones externas que requieren confirmación explícita antes de ejecutarse: aplicar la migración `0002`, crear y borrar el usuario demo, `git push`, editar metadatos del repo en GitHub.
- Verificación base tras cada tarea: `npm run typecheck` sin errores.

## Review Focus

1. **Contexto no seguro o sin WebAuthn** (http por IP en la red local, Firefox viejo): `passkeySupport()` debe devolver `false` sin lanzar, y la pantalla de bloqueo debe verse exactamente como hoy. Prueba en Tarea 4.
2. **Migración `0002` aún no aplicada**: `listPasskeys()` falla con "relation does not exist"; la bóveda debe abrir igual con contraseña maestra y sin opciones biométricas. Prueba en Tarea 5.
3. **Usuario cancela el prompt biométrico** (auto-lanzado o manual): sin mensaje de error, sin quedarse en estado "cargando". Prueba en Tarea 6.
4. **Credencial sin usuario visible, con título de 80+ caracteres o con `decryptError`**: la tarjeta no se desborda y el panel muestra el mensaje de error en vez de campos. Prueba en Tarea 1.
5. **Secreto PRF correcto pero fila de otra passkey** (AAD distinto) o DEK envuelta corrupta: `unwrapDekWithSecret` lanza `PasskeyUnlockError`, nunca devuelve una llave. Prueba en Tarea 2.

---

## Estructura de archivos

| Archivo | Acción | Responsabilidad |
| --- | --- | --- |
| `src/components/CredentialCard.tsx` | reescribir | Tarjeta compacta, no expandible |
| `src/components/CredentialDrawer.tsx` | crear | Panel lateral con el detalle |
| `src/app/(vault)/clientes/[id]/page.tsx` | modificar | `selected` en vez de `open` |
| `src/app/app.css` | modificar | Estilos de tarjeta, drawer, gate biométrico, seguridad |
| `src/lib/crypto.ts` | modificar | `wrapDekWithSecret`, `unwrapDekWithSecret`, `PasskeyUnlockError` |
| `scripts/test-crypto.mts` | modificar | Pruebas de la envoltura por passkey |
| `supabase/migrations/0002_passkeys.sql` | crear | Tabla `vault_passkeys` + RLS |
| `src/lib/types.ts` | modificar | Tipo `PasskeyRecord` |
| `src/lib/data.ts` | modificar | CRUD de passkeys, `currentUser` |
| `src/lib/passkey.ts` | crear | Todo WebAuthn |
| `src/lib/vault.tsx` | modificar | Estado y acciones biométricas |
| `src/components/VaultGate.tsx` | modificar | Pantalla de bloqueo con biometría y oferta |
| `src/components/SecurityDialog.tsx` | crear | Dispositivos: listar, agregar, revocar |
| `src/components/Shell.tsx` | modificar | Botón "Seguridad" |
| `scripts/seed-demo.mts` | crear | Datos de ejemplo cifrados |
| `README.md`, `README.es.md`, `LICENSE`, `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, `.github/**`, `docs/screenshots/*` | crear / reescribir | Documentación de comunidad |

---

### Task 1: Panel lateral de credenciales

**Files:**
- Rewrite: `src/components/CredentialCard.tsx`
- Create: `src/components/CredentialDrawer.tsx`
- Modify: `src/app/(vault)/clientes/[id]/page.tsx`
- Modify: `src/app/app.css` (bloque `.cred-grid` … `@keyframes cred-open`, líneas 67-85; y media query móvil)

**Interfaces:**
- Produces: `CredentialCard` con props `{ credential, service?, selected: boolean, onOpen: () => void, via?, usedBy? }`; `CredentialDrawer` con props `{ credential: Credential | null, service?, via?, usedBy?, onClose, onEdit, onDelete, onJump }`; se conserva `export type Linked`.

- [ ] **Step 1: Reescribir `CredentialCard.tsx`**

```tsx
"use client";

import { KeyRound, Link2, TriangleAlert, User } from "lucide-react";
import type { Credential, Service } from "@/lib/types";
import { useVault } from "@/lib/vault";
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

export function CredentialCard({ credential: c, service, selected, onOpen, via, usedBy = [] }: Props) {
  const { copy } = useVault();
  const stale = Date.now() - new Date(c.last_rotated_at).getTime() > 90 * DAY;
  const linked = via && via !== "missing" ? via : undefined;
  // Con cuenta vinculada, los atajos copian el usuario y la contraseña de esa cuenta
  const user = userOf(c) ?? userOf(linked?.credential);
  const secret = secretOf(c) ?? secretOf(linked?.credential);

  return (
    <article className={`bv-cred cred-tile ${selected ? "is-selected" : ""}`} id={`c-${c.id}`} onClick={onOpen}>
      <button type="button" className="cred-tile-main" aria-haspopup="dialog" onClick={(e) => { e.stopPropagation(); onOpen(); }}>
        <LogoTile src={service?.logo_url} name={service?.name ?? c.title} size={44} />
        <span className="cred-tile-titles">
          <span className="cred-tile-title">{c.title}</span>
          <span className="cred-tile-sub">{service?.name ?? "Sin servicio"}</span>
        </span>
      </button>
      <div className="cred-tile-foot">
        <span className="cred-tile-who">
          {linked && <span className="cred-tile-via"><Link2 aria-hidden /> con {linked.service?.name ?? linked.credential.title}</span>}
          {via === "missing" && <span className="cred-tile-via is-broken"><TriangleAlert aria-hidden /> Cuenta vinculada eliminada</span>}
          {!via && user && <span className="cred-tile-user">{user.value}</span>}
          {c.decryptError && <span className="cred-tile-via is-broken"><TriangleAlert aria-hidden /> No se pudo descifrar</span>}
        </span>
        <span className="cred-tile-meta">
          {usedBy.length > 0 && <span className="cred-tile-links" title={`Se usa para entrar a ${usedBy.length} servicio(s)`}><Link2 aria-hidden />{usedBy.length}</span>}
          {stale && <span className="cred-tile-stale" title="Lleva más de 90 días sin rotarse" />}
          <Badge tone={c.environment} />
        </span>
        {!c.decryptError && (
          <span className="cred-tile-quick" onClick={(e) => e.stopPropagation()}>
            {user && <IconButton label={`Copiar ${user.label}`} onClick={() => copy(user.value, user.label)}><User /></IconButton>}
            {secret && <IconButton label={`Copiar ${secret.label}`} onClick={() => copy(secret.value, secret.label)}><KeyRound /></IconButton>}
          </span>
        )}
      </div>
    </article>
  );
}
```

- [ ] **Step 2: Crear `CredentialDrawer.tsx`**

El `<dialog>` se abre cuando `credential` no es `null`. Se guarda la última credencial en un ref para que el contenido no desaparezca durante el cierre.

```tsx
"use client";

import { useEffect, useRef } from "react";
import { ArrowUpRight, ExternalLink, Pencil, Trash2, X } from "lucide-react";
import type { Credential, Service } from "@/lib/types";
import { Badge, Button, IconButton, LogoTile, SecretField } from "@/components/ui";
import { DAY, userOf, type Linked } from "@/components/CredentialCard";

function ago(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / DAY);
  if (d <= 0) return "hoy";
  if (d === 1) return "ayer";
  if (d < 30) return `hace ${d} días`;
  const m = Math.floor(d / 30);
  return m === 1 ? "hace 1 mes" : `hace ${m} meses`;
}

type Props = {
  credential: Credential | null;
  service?: Service;
  via?: Linked | "missing";
  usedBy?: Linked[];
  onClose: () => void;
  onEdit: (c: Credential) => void;
  onDelete: (c: Credential) => void;
  onJump: (id: string) => void;
};

export function CredentialDrawer({ credential: c, service, via, usedBy = [], onClose, onEdit, onDelete, onJump }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (c && !d.open) d.showModal();
    if (!c && d.open) d.close();
  }, [c]);

  const linked = via && via !== "missing" ? via : undefined;
  const fields = c?.secret?.fields.filter((f) => f.value) ?? [];
  const stale = c ? Date.now() - new Date(c.last_rotated_at).getTime() > 90 * DAY : false;

  return (
    <dialog
      ref={ref}
      className="drawer"
      aria-label={c ? `Credencial ${c.title}` : undefined}
      onClose={onClose}
      onCancel={(e) => { e.preventDefault(); onClose(); }}
      onMouseDown={(e) => { if (e.target === ref.current) onClose(); }}
    >
      {c && (
        <div className="drawer-inner" key={c.id}>
          <div className="sheet-grabber" aria-hidden />
          <header className="drawer-head">
            <LogoTile src={service?.logo_url} name={service?.name ?? c.title} size={52} />
            <div className="drawer-titles">
              <h2 className="display-md">{c.title}</h2>
              <span className="muted">{service?.name ?? "Sin servicio"}</span>
            </div>
            <IconButton label="Cerrar" onClick={onClose}><X /></IconButton>
          </header>
          <div className="drawer-meta">
            <Badge tone={c.environment} />
            {stale && <span className="drawer-stale">Rotar pronto</span>}
            {c.login_url ? (
              <a className="drawer-login" href={c.login_url} target="_blank" rel="noreferrer noopener">Abrir login <ExternalLink aria-hidden /></a>
            ) : (
              <span className="faint">Sin URL de acceso</span>
            )}
          </div>

          <div className="drawer-body">
            {linked && (
              <section className="drawer-section">
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
            {via === "missing" && <p className="cred-error" style={{ padding: 0, margin: 0 }}>La cuenta con la que se iniciaba sesión ya no existe. Edita esta credencial y elige otra.</p>}

            {c.decryptError ? (
              <p className="cred-error" style={{ padding: 0, margin: 0 }}>No se pudo descifrar esta credencial. Puede estar dañada o haber sido cifrada con otra llave.</p>
            ) : (
              <section className="drawer-section drawer-fields">
                {fields.map((f, i) => <SecretField key={i} label={f.label} value={f.value} secret={f.secret} />)}
                {fields.length === 0 && !linked && <p className="faint" style={{ margin: 0 }}>Esta credencial no tiene campos.</p>}
                {c.secret?.notes && <p className="bv-cred-notes">{c.secret.notes}</p>}
              </section>
            )}

            {usedBy.length > 0 && (
              <section className="drawer-section">
                <span className="bv-label">Se usa para entrar a</span>
                <div className="used-by">
                  {usedBy.map((u) => (
                    <button key={u.credential.id} type="button" className="chip" onClick={() => onJump(u.credential.id)}>
                      <LogoTile src={u.service?.logo_url} name={u.service?.name ?? u.credential.title} size={20} />
                      {u.service?.name ?? u.credential.title}
                    </button>
                  ))}
                </div>
              </section>
            )}
          </div>

          <footer className="drawer-foot">
            <span className="faint">Actualizada {ago(c.updated_at)} · rotada {ago(c.last_rotated_at)}</span>
            <div className="drawer-actions">
              <Button size="sm" icon={<Pencil />} onClick={() => onEdit(c)}>Editar</Button>
              <Button size="sm" variant="ghost" icon={<Trash2 />} onClick={() => onDelete(c)}>Eliminar</Button>
            </div>
          </footer>
        </div>
      )}
    </dialog>
  );
}
```

- [ ] **Step 3: Actualizar la página de cliente**

En `src/app/(vault)/clientes/[id]/page.tsx`:

1. Imports: quitar `ChevronsDownUp`, `ChevronsUpDown`; añadir `import { CredentialDrawer } from "@/components/CredentialDrawer";`.
2. Sustituir `const [open, setOpen] = useState<Set<string>>(new Set());` por `const [selected, setSelected] = useState<string | null>(null);`.
3. Efecto del hash:

```tsx
  // Abre la credencial si viene de ⌘K
  useEffect(() => {
    if (loading || !location.hash.startsWith("#c-")) return;
    setSelected(location.hash.slice(3));
  }, [loading]);
```

4. Eliminar `toggle`, `allOpen`, `toggleAll` y el `jumpTo` actual. Añadir tras `shown`:

```tsx
  const current = selected ? byId.get(selected) ?? null : null;
```

5. Eliminar el `<Button size="sm" icon={allOpen ? …}>…</Button>` de la barra.
6. Rejilla:

```tsx
          <div className="cred-grid">
            {shown.map((c) => (
              <CredentialCard key={c.id} credential={c} service={serviceById(c.service_id)} selected={selected === c.id} onOpen={() => setSelected(c.id)} via={viaOf(c)} usedBy={usedBy.get(c.id)} />
            ))}
          </div>
```

7. Antes de `<CredentialDialog …>`:

```tsx
      <CredentialDrawer
        credential={current}
        service={serviceById(current?.service_id ?? null)}
        via={current ? viaOf(current) : undefined}
        usedBy={current ? usedBy.get(current.id) : undefined}
        onClose={() => setSelected(null)}
        onEdit={(c) => { setSelected(null); setCredDialog({ open: true, credential: c }); }}
        onDelete={(c) => { setSelected(null); setToDelete(c); }}
        onJump={setSelected}
      />
```

(Se cierra el panel antes de abrir otro diálogo modal para no apilar dos `<dialog>`.)

- [ ] **Step 4: CSS**

En `src/app/app.css`, reemplazar las líneas de `.cred-grid` hasta `@keyframes cred-open` (67-85) por:

```css
.cred-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: var(--space-3); align-items: stretch; }
.cred-tile { display: flex; flex-direction: column; cursor: pointer; transition: border-color .15s, box-shadow .2s, transform .15s; scroll-margin: 120px; }
.cred-tile:hover { border-color: var(--line-strong); transform: translateY(-1px); }
.cred-tile.is-selected { border-color: color-mix(in srgb, var(--accent) 45%, var(--line)); box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent) 20%, transparent); }
.cred-tile-main { flex: 1; display: flex; align-items: flex-start; gap: 12px; padding: 14px 14px 10px; border: 0; background: none; color: inherit; text-align: left; cursor: pointer; border-radius: var(--radius-lg) var(--radius-lg) 0 0; }
.cred-tile-main:focus-visible { outline: 2px solid var(--focus); outline-offset: -2px; }
.cred-tile-titles { flex: 1; min-width: 0; display: grid; gap: 2px; }
.cred-tile-title { font: 700 15px/20px var(--font-sans); color: var(--ink); overflow-wrap: anywhere; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.cred-tile-sub { font: 600 12px/16px var(--font-sans); color: var(--ink-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cred-tile-foot { display: flex; align-items: center; gap: 8px; padding: 6px 8px 8px 14px; border-top: 1px solid var(--line); min-height: 48px; }
.cred-tile-who { flex: 1; min-width: 0; display: grid; }
.cred-tile-user { font: 400 12px/16px var(--font-mono); color: var(--ink-faint); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cred-tile-meta { display: flex; align-items: center; gap: 8px; flex: none; }
.cred-tile-stale { width: 8px; height: 8px; border-radius: 4px; background: var(--warning); box-shadow: 0 0 0 3px color-mix(in srgb, var(--warning) 20%, transparent); }
.cred-tile-quick { display: flex; gap: 2px; flex: none; }

/* Panel lateral de credencial */
.drawer { position: fixed; inset: 0 0 0 auto; margin: 0; width: min(460px, 100vw); height: 100dvh; max-width: none; max-height: none; padding: 0; border: 0; border-left: 1px solid var(--line); background: var(--surface); color: var(--ink); box-shadow: var(--shadow-pop); overflow: hidden; }
.drawer[open] { animation: drawer-in .24s cubic-bezier(.2,.8,.2,1); }
.drawer::backdrop { background: rgb(0 0 0 / .55); backdrop-filter: blur(2px); animation: drawer-fade .24s ease-out; }
.drawer .sheet-grabber { display: none; }
.drawer-inner { height: 100%; display: flex; flex-direction: column; }
.drawer-head { display: flex; align-items: flex-start; gap: 14px; padding: 22px 16px 12px 22px; }
.drawer-titles { flex: 1; min-width: 0; display: grid; gap: 2px; }
.drawer-titles h2 { margin: 0; overflow-wrap: anywhere; }
.drawer-meta { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; padding: 0 22px 16px; border-bottom: 1px solid var(--line); font: 600 12px/16px var(--font-sans); }
.drawer-login { margin-left: auto; display: inline-flex; align-items: center; gap: 4px; color: var(--accent-ink); font-weight: 700; text-decoration: none; }
.drawer-login:hover { text-decoration: underline; }
.drawer-login svg { width: 12px; height: 12px; }
.drawer-stale { color: var(--warning); font-weight: 700; }
.drawer-body { flex: 1; overflow-y: auto; overscroll-behavior: contain; padding: 20px 22px; display: grid; gap: 22px; align-content: start; }
.drawer-section { display: grid; gap: 8px; }
.drawer-fields { gap: var(--space-4); }
.drawer-foot { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; padding: 12px 16px 12px 22px; border-top: 1px solid var(--line); background: var(--surface-raised); font: 500 12px/16px var(--font-sans); }
.drawer-actions { display: flex; gap: 6px; }
@keyframes drawer-in { from { transform: translateX(32px); opacity: 0; } }
@keyframes drawer-fade { from { opacity: 0; } }
```

Dentro de `@media (max-width: 900px)`, sustituir las reglas `.cred-tile-quick .bv-icon-btn` y `.cred-tile-bar` por:

```css
  .cred-tile-quick .bv-icon-btn { width: 40px; height: 40px; }
  .drawer { inset: auto 0 0 0; width: 100vw; height: min(92dvh, 100dvh); border-left: 0; border-top: 1px solid var(--line); border-radius: 24px 24px 0 0; padding-bottom: var(--safe-b); }
  .drawer .sheet-grabber { display: block; }
  .drawer-head { padding-top: 10px; }
  @keyframes drawer-in { from { transform: translateY(40px); opacity: 0; } }
```

En el bloque `@media (prefers-reduced-motion: reduce)` existente, añadir: `.drawer[open], .drawer::backdrop { animation: none; }`.

Eliminar reglas que quedan huérfanas: `.cred-tile-toggle`, `.cred-tile-chevron`, `.cred-tile-collapse`, `.cred-tile-bar`, `.cred-tile.is-open`, `.cred-tile.is-flash` y `@keyframes cred-flash`. Antes de borrar cada una, comprobar con `grep -rn "<clase>" src` que nadie más la usa. Mantener `.cred-tile-via`, `.cred-tile-links`, `.via-*`, `.used-by`.

- [ ] **Step 5: Verificar**

Run: `npm run typecheck`
Expected: sin errores.

Run: `npm run dev` y revisar en Chrome una página de cliente a 1440, 1024 y 390px:
- una credencial con título de 80+ caracteres ocupa dos líneas y no desborda;
- una credencial sin usuario muestra el pie sin texto y sin botones rotos;
- clic en tarjeta abre el panel; `Esc` y clic fuera cierran; el botón de copiar en la tarjeta no abre el panel;
- "Ver cuenta" cambia el contenido del panel sin cerrarlo;
- ⌘K → elegir credencial → abre el panel de esa credencial.

- [ ] **Step 6: Commit**

```bash
git add -A src
git commit -m "feat: panel lateral para el detalle de credenciales"
```

---

### Task 2: Envoltura de la DEK con secreto de passkey

**Files:**
- Modify: `src/lib/crypto.ts` (añadir tras `rewrapVault`)
- Test: `scripts/test-crypto.mts`

**Interfaces:**
- Produces:
  - `type PasskeyWrap = { wrapped_key: string; wrap_iv: string }`
  - `wrapDekWithSecret(dek: CryptoKey /* extraíble */, secret: Uint8Array<ArrayBuffer>, credentialId: string): Promise<PasskeyWrap>`
  - `unwrapDekWithSecret(secret: Uint8Array<ArrayBuffer>, wrap: PasskeyWrap, credentialId: string): Promise<CryptoKey>` (no extraíble; lanza `PasskeyUnlockError`)
  - `class PasskeyUnlockError extends Error`

- [ ] **Step 1: Escribir las pruebas que fallan**

En `scripts/test-crypto.mts`, ampliar el import con `wrapDekWithSecret, unwrapDekWithSecret, PasskeyUnlockError` y añadir antes del `console.log` final:

```ts
// Passkey: la DEK envuelta con el secreto PRF abre las mismas credenciales
const prf = crypto.getRandomValues(new Uint8Array(new ArrayBuffer(32)));
const dekX = await unlockVault("nueva frase maestra 999", rec2, true);
const wrap = await wrapDekWithSecret(dekX, prf, "cred-A");
const dek4 = await unwrapDekWithSecret(prf, wrap, "cred-A");
assert.equal(dek4.extractable, false);
assert.deepEqual(await decryptJSON(dek4, payload, id), secret);

// Secreto distinto, passkey distinta (AAD) o envoltura corrupta: nunca devuelve llave
const otro = crypto.getRandomValues(new Uint8Array(new ArrayBuffer(32)));
await assert.rejects(unwrapDekWithSecret(otro, wrap, "cred-A"), PasskeyUnlockError);
await assert.rejects(unwrapDekWithSecret(prf, wrap, "cred-B"), PasskeyUnlockError);
await assert.rejects(unwrapDekWithSecret(prf, { ...wrap, wrapped_key: wrap.wrapped_key.slice(4) + "AAAA" }, "cred-A"), PasskeyUnlockError);

// Dos envolturas de la misma DEK no comparten IV
const wrap2 = await wrapDekWithSecret(dekX, prf, "cred-A");
assert.notEqual(wrap.wrap_iv, wrap2.wrap_iv);
```

- [ ] **Step 2: Comprobar que fallan**

Run: `npm run test:crypto`
Expected: FAIL, `wrapDekWithSecret` no se exporta desde `crypto.ts`.

- [ ] **Step 3: Implementar**

En `src/lib/crypto.ts`, tras `rewrapVault`:

```ts
/* ── Desbloqueo biométrico (passkey + PRF) ──────────────────────
 *  secreto PRF (32 B) ──HKDF-SHA256──▶ KEK del dispositivo
 *  la misma DEK ──envuelta con esa KEK──▶ vault_passkeys.wrapped_key
 */
export type PasskeyWrap = { wrapped_key: string; wrap_iv: string };

const PASSKEY_INFO = enc.encode("boveda:passkey-kek:v1");
const passkeyAad = (credentialId: string) => enc.encode(`boveda:dek:passkey:v1:${credentialId}`);

async function derivePasskeyKek(secret: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey("raw", secret, "HKDF", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt: new Uint8Array(new ArrayBuffer(32)), info: PASSKEY_INFO },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["wrapKey", "unwrapKey"],
  );
}

/** Envuelve la DEK (debe ser extraíble) para una passkey concreta. */
export async function wrapDekWithSecret(dek: CryptoKey, secret: Uint8Array<ArrayBuffer>, credentialId: string): Promise<PasskeyWrap> {
  const iv = randomBytes(12);
  const kek = await derivePasskeyKek(secret);
  const wrapped = await crypto.subtle.wrapKey("raw", dek, kek, { name: "AES-GCM", iv, additionalData: passkeyAad(credentialId) });
  return { wrapped_key: toB64(wrapped), wrap_iv: toB64(iv) };
}

/** Abre la DEK con el secreto de la passkey: lanza PasskeyUnlockError si no corresponde. */
export async function unwrapDekWithSecret(secret: Uint8Array<ArrayBuffer>, wrap: PasskeyWrap, credentialId: string): Promise<CryptoKey> {
  try {
    const kek = await derivePasskeyKek(secret);
    return await crypto.subtle.unwrapKey(
      "raw",
      fromB64(wrap.wrapped_key),
      kek,
      { name: "AES-GCM", iv: fromB64(wrap.wrap_iv), additionalData: passkeyAad(credentialId) },
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"],
    );
  } catch {
    throw new PasskeyUnlockError();
  }
}

export class PasskeyUnlockError extends Error {
  constructor() {
    super("No encontramos la llave de este dispositivo. Usa tu contraseña maestra.");
    this.name = "PasskeyUnlockError";
  }
}
```

Actualizar también el comentario de cabecera del archivo con la línea: ` *  passkey (PRF) ──HKDF-SHA256──▶ KEK del dispositivo ──envuelve la misma DEK──▶ vault_passkeys`.

- [ ] **Step 4: Comprobar que pasan**

Run: `npm run test:crypto && npm run typecheck`
Expected: `✓ todas las pruebas de cifrado pasaron`, typecheck limpio.

- [ ] **Step 5: Commit**

```bash
git add src/lib/crypto.ts scripts/test-crypto.mts
git commit -m "feat: envoltura de la DEK con secreto de passkey (HKDF + AES-GCM)"
```

---

### Task 3: Tabla `vault_passkeys` y capa de datos

**Files:**
- Create: `supabase/migrations/0002_passkeys.sql`
- Modify: `src/lib/types.ts`, `src/lib/data.ts`

**Interfaces:**
- Produces:
  - `type PasskeyRecord = { id: string; credential_id: string; prf_salt: string; wrapped_key: string; wrap_iv: string; label: string; created_at: string; last_used_at: string | null }`
  - `listPasskeys(): Promise<PasskeyRecord[]>`
  - `savePasskey(input: Pick<PasskeyRecord, "credential_id" | "prf_salt" | "wrapped_key" | "wrap_iv" | "label">): Promise<PasskeyRecord>`
  - `deletePasskey(id: string): Promise<void>`
  - `touchPasskey(id: string): Promise<void>`
  - `currentUser(): Promise<{ id: string; email: string }>`

- [ ] **Step 1: Migración**

`supabase/migrations/0002_passkeys.sql`:

```sql
-- Bóveda — desbloqueo biométrico
-- Cada fila es la MISMA llave de datos (DEK) envuelta con una llave derivada del
-- secreto PRF de una passkey. Sin el dispositivo y su biometría, la fila no sirve de nada.

create table public.vault_passkeys (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  credential_id  text not null unique,              -- base64url, id de la passkey
  prf_salt       text not null,                     -- base64, 32 bytes
  wrapped_key    text not null,                     -- base64 (DEK envuelta con AES-GCM)
  wrap_iv        text not null,                     -- base64
  label          text not null check (char_length(label) between 1 and 80),
  created_at     timestamptz not null default now(),
  last_used_at   timestamptz
);

create index on public.vault_passkeys (owner_id);

alter table public.vault_passkeys enable row level security;

create policy "own passkeys" on public.vault_passkeys for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
```

- [ ] **Step 2: Tipo**

Al final de la sección de tipos de fila en `src/lib/types.ts` (tras `Credential`):

```ts
/** Una passkey registrada: la DEK envuelta con la llave de ese dispositivo. */
export type PasskeyRecord = {
  id: string;
  credential_id: string;
  prf_salt: string;
  wrapped_key: string;
  wrap_iv: string;
  label: string;
  created_at: string;
  last_used_at: string | null;
};
```

- [ ] **Step 3: Datos**

En `src/lib/data.ts`, añadir `PasskeyRecord` al import de tipos y, tras el bloque "Llave de la bóveda":

```ts
/* ── Passkeys (desbloqueo biométrico) ───────────────────────── */
const PASSKEY_COLS = "id,credential_id,prf_salt,wrapped_key,wrap_iv,label,created_at,last_used_at";
export async function listPasskeys(): Promise<PasskeyRecord[]> {
  return check(await db().from("vault_passkeys").select(PASSKEY_COLS).order("created_at"));
}
export async function savePasskey(input: Pick<PasskeyRecord, "credential_id" | "prf_salt" | "wrapped_key" | "wrap_iv" | "label">): Promise<PasskeyRecord> {
  return check(await db().from("vault_passkeys").insert(input).select(PASSKEY_COLS).single());
}
export async function deletePasskey(id: string) {
  check(await db().from("vault_passkeys").delete().eq("id", id));
}
export async function touchPasskey(id: string) {
  check(await db().from("vault_passkeys").update({ last_used_at: new Date().toISOString() }).eq("id", id));
}
```

Y en "Sesión":

```ts
export async function currentUser(): Promise<{ id: string; email: string }> {
  const { data } = await db().auth.getUser();
  if (!data.user) throw new Error("Sesión no encontrada.");
  return { id: data.user.id, email: data.user.email ?? "" };
}
```

- [ ] **Step 4: Verificar y commit**

Run: `npm run typecheck`
Expected: sin errores.

```bash
git add supabase/migrations/0002_passkeys.sql src/lib/types.ts src/lib/data.ts
git commit -m "feat: tabla vault_passkeys y acceso a datos"
```

- [ ] **Step 5 (acción externa, pedir confirmación a Yair): aplicar la migración**

Con el MCP de Supabase: `list_projects` para identificar el proyecto de Bóveda, luego `apply_migration` con nombre `0002_passkeys` y el SQL anterior. Verificar con `list_tables` que `vault_passkeys` existe con RLS activo y con `get_advisors` (security) que no hay avisos nuevos.

---

### Task 4: `passkey.ts`, el único archivo que habla WebAuthn

**Files:**
- Create: `src/lib/passkey.ts`

**Interfaces:**
- Consumes: `toB64`, `fromB64` de `./crypto`; `PasskeyRecord` de `./types`.
- Produces:
  - `passkeySupport(): Promise<boolean>` (nunca lanza)
  - `biometricName(): string`, `deviceLabel(): string`
  - `registerPasskey(user: { id: string; email: string }, existing: Pick<PasskeyRecord, "credential_id">[]): Promise<{ credentialId: string; prfSalt: string; secret: Uint8Array<ArrayBuffer> }>`
  - `assertPasskey(records: Pick<PasskeyRecord, "credential_id" | "prf_salt">[]): Promise<{ credentialId: string; secret: Uint8Array<ArrayBuffer> }>`
  - `class PasskeyCancelledError`, `class PasskeyUnsupportedError`

- [ ] **Step 1: Implementar**

```ts
/**
 * Desbloqueo biométrico con passkeys (WebAuthn + extensión PRF).
 *
 * La passkey no "inicia sesión": al verificar al usuario con huella o rostro, el autenticador
 * entrega un secreto de 32 bytes (PRF) con el que se abre la DEK. El reto se genera aquí y la
 * aserción no se verifica en servidor: la frontera de seguridad es ese secreto, no la firma.
 */
import { fromB64, toB64 } from "./crypto";
import type { PasskeyRecord } from "./types";

const enc = new TextEncoder();
const random = (n: number) => crypto.getRandomValues(new Uint8Array(new ArrayBuffer(n)));

const toB64Url = (buf: ArrayBuffer | Uint8Array) => toB64(buf).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64Url = (s: string) => fromB64(s.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(s.length / 4) * 4, "="));

type PrfResults = { enabled?: boolean; results?: { first?: BufferSource } };
const prfOf = (cred: PublicKeyCredential) => (cred.getClientExtensionResults() as { prf?: PrfResults }).prf;
const bytes = (b: BufferSource): Uint8Array<ArrayBuffer> => {
  const view = b instanceof ArrayBuffer ? new Uint8Array(b) : new Uint8Array(b.buffer, b.byteOffset, b.byteLength);
  return new Uint8Array(view) as Uint8Array<ArrayBuffer>; // copia propia
};

export class PasskeyCancelledError extends Error {
  constructor() { super("Desbloqueo cancelado."); this.name = "PasskeyCancelledError"; }
}
export class PasskeyUnsupportedError extends Error {
  constructor() { super("Este navegador o dispositivo no permite desbloqueo biométrico cifrado."); this.name = "PasskeyUnsupportedError"; }
}

/** El usuario cerró el prompt, se agotó el tiempo o el navegador lo bloqueó. */
function rethrow(e: unknown): never {
  const name = (e as { name?: string })?.name;
  if (name === "NotAllowedError" || name === "AbortError") throw new PasskeyCancelledError();
  throw e;
}

/** ¿Hay autenticador de plataforma con verificación de usuario (y PRF, si el navegador lo anuncia)? Nunca lanza. */
export async function passkeySupport(): Promise<boolean> {
  try {
    if (typeof window === "undefined" || !window.isSecureContext || !window.PublicKeyCredential) return false;
    if (!(await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable())) return false;
    const caps = await (PublicKeyCredential as unknown as { getClientCapabilities?: () => Promise<Record<string, boolean>> }).getClientCapabilities?.();
    return caps?.["extension:prf"] !== false;
  } catch {
    return false;
  }
}

type Platform = "ios" | "mac" | "windows" | "android" | "other";
function platform(): Platform {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return "ios";
  if (/Macintosh/.test(ua)) return "mac";
  if (/Windows/.test(ua)) return "windows";
  if (/Android/.test(ua)) return "android";
  return "other";
}
/** Nombre que el usuario reconoce: "Touch ID", "Face ID"… */
export function biometricName(): string {
  return { ios: "Face ID", mac: "Touch ID", windows: "Windows Hello", android: "tu huella", other: "biometría" }[platform()];
}
export function deviceLabel(): string {
  return { ios: "iPhone / iPad · Face ID", mac: "Mac · Touch ID", windows: "PC · Windows Hello", android: "Android · huella", other: "Este dispositivo" }[platform()];
}

export async function assertPasskey(records: Pick<PasskeyRecord, "credential_id" | "prf_salt">[]): Promise<{ credentialId: string; secret: Uint8Array<ArrayBuffer> }> {
  const evalByCredential = Object.fromEntries(records.map((r) => [r.credential_id, { first: fromB64(r.prf_salt) }]));
  let cred: PublicKeyCredential | null;
  try {
    cred = (await navigator.credentials.get({
      publicKey: {
        challenge: random(32),
        rpId: location.hostname,
        userVerification: "required",
        allowCredentials: records.map((r) => ({ type: "public-key" as const, id: fromB64Url(r.credential_id) })),
        extensions: { prf: { evalByCredential } } as AuthenticationExtensionsClientInputs,
      },
    })) as PublicKeyCredential | null;
  } catch (e) {
    rethrow(e);
  }
  const first = cred && prfOf(cred)?.results?.first;
  if (!cred || !first) throw new PasskeyUnsupportedError();
  return { credentialId: toB64Url(cred.rawId), secret: bytes(first) };
}

export async function registerPasskey(
  user: { id: string; email: string },
  existing: Pick<PasskeyRecord, "credential_id">[],
): Promise<{ credentialId: string; prfSalt: string; secret: Uint8Array<ArrayBuffer> }> {
  const salt = random(32);
  let cred: PublicKeyCredential | null;
  try {
    cred = (await navigator.credentials.create({
      publicKey: {
        challenge: random(32),
        rp: { name: "Bóveda", id: location.hostname },
        // Sufijo aleatorio: varias passkeys del mismo usuario pueden convivir en un autenticador
        user: { id: enc.encode(`${user.id}:${toB64Url(random(6))}`), name: user.email, displayName: user.email },
        pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
        authenticatorSelection: { authenticatorAttachment: "platform", residentKey: "preferred", userVerification: "required" },
        excludeCredentials: existing.map((r) => ({ type: "public-key" as const, id: fromB64Url(r.credential_id) })),
        extensions: { prf: { eval: { first: salt } } } as AuthenticationExtensionsClientInputs,
      },
    })) as PublicKeyCredential | null;
  } catch (e) {
    if ((e as { name?: string })?.name === "InvalidStateError") throw new Error("Este dispositivo ya está registrado.");
    rethrow(e);
  }
  const prf = cred && prfOf(cred);
  if (!cred || !prf?.enabled) throw new PasskeyUnsupportedError();
  const credentialId = toB64Url(cred.rawId);
  const prfSalt = toB64(salt);
  // Algunos autenticadores solo entregan el secreto al autenticar, no al crear: segundo toque
  const secret = prf.results?.first ? bytes(prf.results.first) : (await assertPasskey([{ credential_id: credentialId, prf_salt: prfSalt }])).secret;
  return { credentialId, prfSalt, secret };
}
```

Nota para quien implemente: `user.id` admite hasta 64 bytes; el UUID (36) + ":" + 8 caracteres cabe. Si `tsc` ya conoce `prf` en `AuthenticationExtensionsClientInputs`, los `as` sobran pero no estorban.

- [ ] **Step 2: Verificar**

Run: `npm run typecheck`
Expected: sin errores.

Prueba de Review Focus 1 (contexto no seguro): con `npm run dev` abierto, entrar por la IP de red local (`http://192.168.x.x:3000`) y ejecutar en la consola `await (await import("/src/lib/passkey.ts")).passkeySupport()` no es posible en producción, así que la comprobación se hace en la Tarea 6: en ese origen la pantalla de bloqueo debe verse igual que hoy, sin botón biométrico y sin errores en consola.

- [ ] **Step 3: Commit**

```bash
git add src/lib/passkey.ts
git commit -m "feat: passkeys WebAuthn con PRF para obtener la llave del dispositivo"
```

---

### Task 5: Estado de la bóveda

**Files:**
- Modify: `src/lib/vault.tsx`

**Interfaces:**
- Consumes: Tareas 2, 3 y 4.
- Produces, añadido a `VaultCtx`:
  - `passkeys: PasskeyRecord[]`
  - `biometrics: { supported: boolean; name: string }`
  - `verifyMaster(master: string): Promise<void>` (lanza `WrongMasterPasswordError`)
  - `unlockWithPasskey(): Promise<void>` (lanza `PasskeyCancelledError`, `PasskeyUnlockError`, `PasskeyUnsupportedError`)
  - `enrollPasskey(master: string): Promise<void>`
  - `removePasskey(id: string): Promise<void>`

- [ ] **Step 1: Implementar**

Imports:

```ts
import { createVault, rewrapVault, unlockVault, unwrapDekWithSecret, wrapDekWithSecret, PasskeyUnlockError, type VaultKeyRecord } from "./crypto";
import { currentUser, deletePasskey, getVaultKey, listPasskeys, replaceVaultKey, savePasskey, saveVaultKey, seedDefaultServices, touchPasskey } from "./data";
import { assertPasskey, biometricName, deviceLabel, passkeySupport, registerPasskey } from "./passkey";
import type { PasskeyRecord } from "./types";
```

Estado nuevo en `VaultProvider`:

```ts
  const [passkeys, setPasskeys] = useState<PasskeyRecord[]>([]);
  const [biometrics, setBiometrics] = useState({ supported: false, name: "biometría" });
```

Sustituir el efecto de carga inicial por:

```ts
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
```

Acciones, tras `unlock`:

```ts
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
    touchPasskey(row.id).catch(() => { /* solo es informativo */ });
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
```

Añadir los seis miembros al tipo `VaultCtx` y al `value` del `Ctx.Provider`.

- [ ] **Step 2: Verificar (incluye Review Focus 2)**

Run: `npm run typecheck`
Expected: sin errores.

Si la migración `0002` todavía no está aplicada en el proyecto de desarrollo, abrir la app: debe mostrarse "Bóveda bloqueada" y desbloquear con contraseña maestra con normalidad, sin pantalla "No pudimos abrir la bóveda". Si ya está aplicada, simular el fallo cambiando temporalmente el nombre de la tabla en `listPasskeys` a `"vault_passkeys_x"`, comprobar lo mismo y revertir.

- [ ] **Step 3: Commit**

```bash
git add src/lib/vault.tsx
git commit -m "feat: estado y acciones de desbloqueo biométrico en la bóveda"
```

---

### Task 6: Pantalla de bloqueo, oferta de activación y diálogo de seguridad

**Files:**
- Modify: `src/components/VaultGate.tsx` (función `UnlockScreen`)
- Create: `src/components/SecurityDialog.tsx`
- Modify: `src/components/Shell.tsx`
- Modify: `src/app/app.css`

**Interfaces:**
- Consumes: `useVault()` con los miembros de la Tarea 5; `PasskeyCancelledError` de `@/lib/passkey`.
- Produces: `SecurityDialog({ open, onClose })`.

- [ ] **Step 1: Reescribir `UnlockScreen`**

Imports adicionales en `VaultGate.tsx`: `useEffect, useRef` de react; `Fingerprint` de lucide-react; `PasskeyCancelledError` de `@/lib/passkey`.

```tsx
const OFFER_KEY = "bv-passkey-offer";
const offerDismissed = () => { try { return localStorage.getItem(OFFER_KEY) === "no"; } catch { return true; } };

function UnlockScreen() {
  const { unlock, verifyMaster, unlockWithPasskey, enrollPasskey, passkeys, biometrics, toast } = useVault();
  const hasPasskey = biometrics.supported && passkeys.length > 0;
  const [mode, setMode] = useState<"passkey" | "master" | "offer">(hasPasskey ? "passkey" : "master");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const tried = useRef(false);

  const withPasskey = useCallback(async (silent: boolean) => {
    setBusy(true);
    setErr(null);
    try {
      await unlockWithPasskey();
    } catch (e) {
      // Cancelar no es un error: el botón sigue ahí
      if (!(e instanceof PasskeyCancelledError) && !silent) setErr((e as Error).message);
      if (!(e instanceof PasskeyCancelledError) && silent) setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [unlockWithPasskey]);

  // Lanza el prompt una sola vez al aparecer la pantalla; si el navegador exige un gesto, queda el botón
  useEffect(() => {
    if (!hasPasskey || tried.current) return;
    tried.current = true;
    withPasskey(true);
  }, [hasPasskey, withPasskey]);

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
        <div className="gate-mark"><Lock /></div>
        <div className="gate-dots" aria-hidden><i className="on" /><i className="on" /><i /></div>
        <div>
          <h1 className="display-md">Bóveda bloqueada</h1>
          <p className="muted" style={{ marginTop: 6 }}>
            {mode === "passkey" ? `Usa ${biometrics.name} para descifrar tus credenciales en este dispositivo.` : "Escribe tu contraseña maestra para descifrar tus credenciales en este navegador."}
          </p>
        </div>
        {mode === "passkey" ? (
          <>
            <Button variant="primary" icon={<Fingerprint />} loading={busy} onClick={() => withPasskey(false)} autoFocus>Desbloquear con {biometrics.name}</Button>
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
```

Simplificar el `catch` de `withPasskey` a una sola línea al implementarlo: `if (!(e instanceof PasskeyCancelledError)) setErr((e as Error).message);` y quitar el parámetro `silent` (las dos ramas hacen lo mismo; cancelar nunca muestra error). Añadir `useCallback` al import de react.

- [ ] **Step 2: Crear `SecurityDialog.tsx`**

```tsx
"use client";

import { useState } from "react";
import { Fingerprint, Trash2 } from "lucide-react";
import { useVault } from "@/lib/vault";
import { WrongMasterPasswordError } from "@/lib/crypto";
import { PasskeyCancelledError } from "@/lib/passkey";
import { Button, Dialog, Field, IconButton } from "@/components/ui";

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" }) : "nunca");

export function SecurityDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { passkeys, biometrics, enrollPasskey, removePasskey, toast } = useVault();
  const [adding, setAdding] = useState(false);
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
    <Dialog open={open} onClose={() => { setAdding(false); setErr(null); setPw(""); onClose(); }} title="Seguridad">
      <div className="security">
        <p className="muted" style={{ margin: 0 }}>
          Dispositivos que pueden abrir tu bóveda con biometría. Cada uno guarda su propia llave; revocarlo aquí la invalida. Tu contraseña maestra siempre funciona.
        </p>
        {passkeys.length === 0 ? (
          <p className="faint" style={{ margin: 0 }}>Aún no hay dispositivos registrados.</p>
        ) : (
          <ul className="security-list">
            {passkeys.map((p) => (
              <li key={p.id}>
                <span className="security-icon"><Fingerprint aria-hidden /></span>
                <span className="security-body">
                  <b>{p.label}</b>
                  <small>Alta {fmt(p.created_at)} · último uso {fmt(p.last_used_at)}</small>
                </span>
                <IconButton label={`Revocar ${p.label}`} onClick={() => revoke(p.id)}><Trash2 /></IconButton>
              </li>
            ))}
          </ul>
        )}
        {!biometrics.supported ? (
          <p className="faint" style={{ margin: 0 }}>Este navegador o dispositivo no permite desbloqueo biométrico cifrado.</p>
        ) : adding ? (
          <form className="security-add" onSubmit={add}>
            <Field label="Contraseña maestra" type="password" autoComplete="current-password" autoFocus required value={pw} onChange={(e) => setPw(e.target.value)} error={err} hint="Se pide una vez para entregarle la llave a este dispositivo." />
            <Button type="submit" variant="primary" icon={<Fingerprint />} loading={busy}>Activar {biometrics.name}</Button>
          </form>
        ) : (
          <Button icon={<Fingerprint />} onClick={() => setAdding(true)}>Agregar este dispositivo</Button>
        )}
      </div>
    </Dialog>
  );
}
```

- [ ] **Step 3: Botón en `Shell.tsx`**

- Import: `Fingerprint` de lucide-react y `import { SecurityDialog } from "@/components/SecurityDialog";`.
- Estado: `const [securityOpen, setSecurityOpen] = useState(false);`
- En `.vault-actions`, antes de "Bloquear bóveda": `<IconButton label="Seguridad y dispositivos" onClick={() => setSecurityOpen(true)}><Fingerprint /></IconButton>`
- Junto a `<CommandPalette …/>`: `<SecurityDialog open={securityOpen} onClose={() => setSecurityOpen(false)} />`

- [ ] **Step 4: CSS**

Añadir a `src/app/app.css`, tras las reglas `.gate …`:

```css
/* Seguridad: dispositivos con desbloqueo biométrico */
.security { display: grid; gap: var(--space-4); }
.security-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
.security-list li { display: flex; align-items: center; gap: 12px; padding: 10px 8px 10px 12px; border: 1px solid var(--line); border-radius: var(--radius-md); background: var(--surface-raised); }
.security-icon { width: 36px; height: 36px; border-radius: 12px; display: grid; place-items: center; background: var(--accent-soft); color: var(--accent-ink); flex: none; }
.security-icon svg { width: 18px; height: 18px; }
.security-body { flex: 1; min-width: 0; display: grid; }
.security-body b { font: 700 14px/20px var(--font-sans); }
.security-body small { font: 500 12px/16px var(--font-sans); color: var(--ink-muted); }
.security-add { display: grid; gap: var(--space-3); }
```

- [ ] **Step 5: Verificar**

Run: `npm run typecheck && npm run build`
Expected: ambos sin errores.

Prueba automática con autenticador virtual (no requiere tocar el sensor). Script fuera del repo, en el scratchpad de la sesión, con `playwright-core` y `channel: "chrome"`:

1. Abrir `http://localhost:3000`, iniciar sesión con el usuario demo (Tarea 7) y activar por CDP: `WebAuthn.enable` y `WebAuthn.addVirtualAuthenticator` con `{ protocol: "ctap2", transport: "internal", hasResidentKey: true, hasUserVerification: true, isUserVerified: true, hasPrf: true, automaticPresenceSimulation: true }`.
2. Escribir la contraseña maestra → aparece "¿Desbloquear con Touch ID?" → "Activar" → la bóveda abre y hay una fila en `vault_passkeys`.
3. Pulsar "Bloquear bóveda" → la bóveda se desbloquea sola por el prompt automático (o tras pulsar el botón) sin escribir nada.
4. Seguridad → revocar → bloquear → vuelve a pedirse la contraseña maestra, sin botón biométrico.
5. Review Focus 3: con `isUserVerified: false` (`WebAuthn.setUserVerified`), pulsar "Desbloquear con Touch ID": el botón deja de cargar, no aparece texto de error rojo y "Usar contraseña maestra" funciona.
6. Review Focus 1: abrir por `http://<IP local>:3000`: pantalla de bloqueo idéntica a la actual, sin botón biométrico, consola sin errores.

Prueba manual de Yair al final: activar y desbloquear con su Touch ID real en Chrome y Safari.

- [ ] **Step 6: Commit**

```bash
git add -A src
git commit -m "feat: desbloqueo con Touch ID / Face ID y gestión de dispositivos"
```

---

### Task 7: Datos de ejemplo (`seed:demo`)

**Files:**
- Create: `scripts/seed-demo.mts`
- Modify: `package.json` (script)

**Interfaces:**
- Consumes: `createVault`, `unlockVault`, `encryptJSON` de `src/lib/crypto.ts`; `SERVICE_PRESETS` de `src/lib/presets.ts`.
- Produces: `npm run seed:demo`.

- [ ] **Step 1: Script**

`package.json` → scripts: `"seed:demo": "node --env-file=.env.local --experimental-strip-types scripts/seed-demo.mts"`.

`scripts/seed-demo.mts`:

```ts
// Datos de ejemplo cifrados: npm run seed:demo
// Requiere en .env.local: BOVEDA_DEMO_EMAIL, BOVEDA_DEMO_PASSWORD, BOVEDA_DEMO_MASTER (≥ 12 caracteres)
// El usuario debe existir ya en Supabase Auth. Si ya tiene clientes, no hace nada.
import { createClient } from "@supabase/supabase-js";
import { createVault, unlockVault, encryptJSON } from "../src/lib/crypto.ts";
import { SERVICE_PRESETS } from "../src/lib/presets.ts";

const env = (k: string) => {
  const v = process.env[k];
  if (!v) { console.error(`Falta ${k} en .env.local`); process.exit(1); }
  return v;
};
const url = env("NEXT_PUBLIC_SUPABASE_URL");
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? env("NEXT_PUBLIC_SUPABASE_ANON_KEY");
const master = env("BOVEDA_DEMO_MASTER");

const db = createClient(url, key, { auth: { persistSession: false } });
const ok = <T,>(res: { data: T; error: { message: string } | null }): T => {
  if (res.error) throw new Error(res.error.message);
  return res.data;
};

const { error: authError } = await db.auth.signInWithPassword({ email: env("BOVEDA_DEMO_EMAIL"), password: env("BOVEDA_DEMO_PASSWORD") });
if (authError) throw new Error(`No se pudo iniciar sesión: ${authError.message}`);

if (ok(await db.from("clients").select("id").limit(1)).length) {
  console.log("Este usuario ya tiene clientes: no se sembró nada.");
  process.exit(0);
}

// Bóveda
const existing = ok(await db.from("vault_keys").select("kdf_salt,kdf_iterations,wrapped_key,wrap_iv").maybeSingle());
let dek: CryptoKey;
if (existing) dek = await unlockVault(master, existing);
else {
  const v = await createVault(master);
  ok(await db.from("vault_keys").insert(v.record));
  dek = v.dek;
}

// Catálogo de servicios
if (!ok(await db.from("services").select("id").limit(1)).length) ok(await db.from("services").insert(SERVICE_PRESETS));
const services = ok(await db.from("services").select("id,name")) as { id: string; name: string }[];
const svc = (name: string) => services.find((s) => s.name === name)?.id ?? null;

type F = [label: string, value: string, secret?: boolean];
type Cred = { key: string; service: string; title: string; env?: "prod" | "staging" | "dev"; url?: string; fields: F[]; notes?: string; via?: string; daysOld?: number };
const fav = (domain: string) => `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;

const CLIENTS: { name: string; website_url: string; logo_url: string | null; notes: string; creds: Cred[] }[] = [
  {
    name: "Café Nómada", website_url: "https://cafenomada.example", logo_url: null, notes: "Cafetería de especialidad. Sitio en WordPress + tienda.",
    creds: [
      { key: "g", service: "Gmail / Google Workspace", title: "Cuenta principal del negocio", fields: [["Correo", "hola@cafenomada.example"], ["Contraseña", "Tueste-Medio_2026!", true], ["Códigos de respaldo 2FA", "4821 9930\n1177 0452\n6603 2298", true]] },
      { key: "gtm", service: "Google Tag Manager", title: "Contenedor web", fields: [["ID del contenedor", "GTM-N0MADA1"]], via: "g" },
      { key: "ga", service: "Google Analytics", title: "Propiedad GA4", fields: [["ID de medición", "G-7K2Q9XWB41"]], via: "g" },
      { key: "host", service: "Hostinger", title: "Hosting y dominio", fields: [["Usuario / correo", "hola@cafenomada.example"], ["Contraseña", "h0st-Nomada#88", true]], daysOld: 140 },
      { key: "ig", service: "Instagram", title: "@cafenomada", fields: [["Usuario / correo", "cafenomada"], ["Contraseña", "espresso.doble.77", true]] },
    ],
  },
  {
    name: "Estudio Lumen", website_url: "https://estudiolumen.example", logo_url: null, notes: "Despacho de arquitectura. App interna en Next.js + Supabase.",
    creds: [
      { key: "sb", service: "Supabase", title: "Proyecto de producción", fields: [["Usuario / correo", "dev@estudiolumen.example"], ["Contraseña", "Lumen!Plano_42", true], ["Llave secreta / token", "sb_secret_DEMO_9f2c1a7e44b0", true]], notes: "La service role solo se usa en el cron de respaldos." },
      { key: "db", service: "Supabase", title: "Postgres directo", env: "staging", fields: [["Host", "db.demo-lumen.example"], ["Puerto", "5432"], ["Usuario", "postgres"], ["Contraseña", "pg-Staging-Lumen-5531", true]] },
      { key: "vc", service: "Vercel", title: "Equipo Lumen", fields: [["Usuario / correo", "dev@estudiolumen.example"], ["Contraseña", "v3rcel-Lumen-2026", true]] },
      { key: "cf", service: "Cloudflare", title: "DNS y SSL", fields: [["Usuario / correo", "dev@estudiolumen.example"], ["Contraseña", "nube.Naranja-19", true], ["Llave secreta / token", "cf_demo_3b8d0e61a2", true]] },
    ],
  },
  {
    name: "Tacos El Güero", website_url: "https://tacoselguero.example", logo_url: null, notes: "Restaurante con pedidos por WhatsApp. Landing + automatizaciones.",
    creds: [
      { key: "meta", service: "Meta Business Suite", title: "Portafolio comercial", fields: [["Usuario / correo", "guero@tacoselguero.example"], ["Contraseña", "Pastor-con-Pina_3", true]] },
      { key: "ntl", service: "Netlify", title: "Landing de pedidos", fields: [["Usuario / correo", "guero@tacoselguero.example"], ["Contraseña", "netl1fy-Trompo!", true]] },
      { key: "vps", service: "Hetzner", title: "VPS de automatizaciones", fields: [["Host / IP", "203.0.113.24"], ["Puerto SSH", "22"], ["Usuario", "root"], ["Contraseña", "S4lsa-Verde-root", true]], daysOld: 200 },
    ],
  },
  {
    name: "Clínica Aurora", website_url: "https://clinicaaurora.example", logo_url: null, notes: "Clínica dental. Agenda en línea y campañas de Google Ads.",
    creds: [
      { key: "g", service: "Gmail / Google Workspace", title: "Recepción", fields: [["Correo", "recepcion@clinicaaurora.example"], ["Contraseña", "Sonrisa.Blanca_61", true]] },
      { key: "ads", service: "Google Ads", title: "Cuenta publicitaria", fields: [["ID de cliente", "481-220-9917"]], via: "g" },
      { key: "gbp", service: "Google Business Profile", title: "Ficha de la clínica", fields: [], via: "g" },
    ],
  },
];

let total = 0;
for (const c of CLIENTS) {
  const client = ok(await db.from("clients").insert({ name: c.name, website_url: c.website_url, logo_url: c.logo_url, notes: c.notes }).select("id").single()) as { id: string };
  const ids = new Map(c.creds.map((k) => [k.key, crypto.randomUUID()]));
  for (const k of c.creds) {
    const id = ids.get(k.key)!;
    const secret = { fields: k.fields.map(([label, value, secret = false]) => ({ label, value, secret })), ...(k.notes ? { notes: k.notes } : {}), ...(k.via ? { via: ids.get(k.via) } : {}) };
    const when = new Date(Date.now() - (k.daysOld ?? 3) * 86_400_000).toISOString();
    ok(await db.from("credentials").insert({ id, client_id: client.id, service_id: svc(k.service), title: k.title, environment: k.env ?? "prod", login_url: k.url ?? null, payload: await encryptJSON(dek, secret, id), last_rotated_at: when }));
    total++;
  }
}
void fav;
console.log(`✓ ${CLIENTS.length} clientes y ${total} credenciales de ejemplo, cifradas con tu contraseña maestra.`);
```

Al implementar: quitar `fav` y `void fav` si los clientes se quedan sin logo, o usarlo para dar logo a los clientes si las capturas se ven pobres con iniciales. Comprobar con `grep -n '"Hostinger"\|"Hetzner"\|"Netlify"\|"Vercel"\|"Cloudflare"\|"Supabase"\|"Instagram"\|"Meta Business Suite"\|"Google Ads"\|"Google Business Profile"' src/lib/presets.ts` que los nombres de servicio coinciden exactamente con el catálogo; ajustar los que no.

- [ ] **Step 2 (acción externa, pedir confirmación a Yair): usuario demo**

Con el MCP de Supabase (`execute_sql`), usando una contraseña aleatoria generada en el momento:

```sql
with u as (
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change, email_change_token_new)
  values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'demo@boveda.example', crypt('<CONTRASEÑA>', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '')
  returning id, email
)
insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), id, id::text, jsonb_build_object('sub', id::text, 'email', email, 'email_verified', true), 'email', now(), now(), now() from u;
```

Si el inicio de sesión con ese usuario falla, pedir a Yair que lo cree desde Authentication → Users → Add user (Auto confirm) y seguir.

Añadir a `.env.local` (archivo ignorado por git) `BOVEDA_DEMO_EMAIL`, `BOVEDA_DEMO_PASSWORD`, `BOVEDA_DEMO_MASTER`.

- [ ] **Step 3: Ejecutar y verificar**

Run: `npm run seed:demo`
Expected: `✓ 4 clientes y 15 credenciales de ejemplo, cifradas con tu contraseña maestra.`

Run de nuevo: `npm run seed:demo`
Expected: `Este usuario ya tiene clientes: no se sembró nada.`

Entrar a la app con el usuario demo: los 4 clientes aparecen, las credenciales descifran y "Analytics" muestra "con Gmail / Google Workspace".

- [ ] **Step 4: Commit**

```bash
git add scripts/seed-demo.mts package.json
git commit -m "feat: script seed:demo con clientes y credenciales de ejemplo"
```

---

### Task 8: Capturas

**Files:**
- Create: `docs/screenshots/{hero,login,lock-biometric,clients,client-drawer,command-palette,services,mobile}.png`

- [ ] **Step 1: Script de captura (en el scratchpad, no en el repo)**

`npm init -y && npm i playwright-core` en el scratchpad. Script con `chromium.launch({ channel: "chrome", headless: true })`, contexto `{ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, colorScheme: "dark" }` y autenticador virtual con `hasPrf: true` (los mismos parámetros de la Tarea 6). Secuencia:

1. `/login` → `login.png`.
2. Iniciar sesión con el usuario demo, contraseña maestra, activar biometría, bloquear → `lock-biometric.png` (pantalla "Desbloquear con Touch ID"; para que no se desbloquee sola antes de la captura, `WebAuthn.setAutomaticPresenceSimulation` a `false` antes de bloquear y a `true` después).
3. `/` → `clients.png`.
4. Cliente "Café Nómada" → `hero.png` (rejilla completa); clic en "Cuenta principal del negocio" → `client-drawer.png`.
5. `Meta+K`, escribir "supa" → `command-palette.png`.
6. `/servicios` → `services.png`.
7. Contexto nuevo `{ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true }` con la misma sesión → cliente con hoja inferior abierta → `mobile.png`.

- [ ] **Step 2: Revisar cada imagen**

Abrir cada PNG y comprobar: ningún dato real (solo dominios `.example`), sin toasts a medias, sin spinners, logos cargados, ninguna contraseña revelada. Repetir las que fallen. Si alguna pesa más de 600 KB, comprimir con `sips` o `pngquant` si está instalado.

- [ ] **Step 3: Commit**

```bash
git add docs/screenshots
git commit -m "docs: capturas de la aplicación con datos de ejemplo"
```

- [ ] **Step 4 (acción externa, confirmar con Yair): borrar el usuario demo**

`delete from auth.users where email = 'demo@boveda.example';` y verificar que `clients`, `credentials`, `vault_keys` y `vault_passkeys` ya no tienen filas de ese `owner_id`. Quitar las variables `BOVEDA_DEMO_*` de `.env.local` si Yair no las quiere conservar.

---

### Task 9: README y documentos de comunidad

**Files:**
- Rewrite: `README.md` (inglés)
- Create: `README.es.md`, `LICENSE`, `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`
- Create: `.github/ISSUE_TEMPLATE/bug_report.yml`, `.github/ISSUE_TEMPLATE/feature_request.yml`, `.github/ISSUE_TEMPLATE/config.yml`, `.github/pull_request_template.md`, `.github/workflows/ci.yml`
- Modify: `package.json`, `.env.example`

- [ ] **Step 1: README (ambos idiomas, misma estructura)**

Orden de secciones y contenido obligatorio:

1. **Hero** centrado: `public/icon.svg`, nombre "Bóveda", lema, insignias (MIT, CI, Next.js 15, Supabase, "E2E encrypted"), enlace al otro idioma y `docs/screenshots/hero.png`.
   - EN: "Every client's credentials in one place, one shortcut away. Encrypted before they leave your browser."
   - ES: "Las credenciales de todos tus clientes, en un solo lugar y a un atajo de distancia. Cifradas antes de salir de tu navegador."
2. **La historia** (2 párrafos). ES: "Eres freelance. Tienes muchos clientes y cada uno trae su Gmail, su hosting, su Tag Manager, su base de datos y su servidor. Terminas con una nota por cliente, contraseñas enterradas en chats de WhatsApp y diez minutos perdidos cada vez que necesitas entrar a algo. Bóveda hace lo contrario: creas al cliente, le enlazas las cuentas de cualquier servicio y cualquier credencial queda a un ⌘K de distancia, cifrada de extremo a extremo." EN: traducción equivalente.
3. **Antes / Con Bóveda**: tabla de dos columnas con 5 filas (notas sueltas → un cliente, todas sus cuentas; contraseñas en WhatsApp → cifrado AES-256-GCM en tu navegador; buscar 10 minutos → ⌘K y copiar; "¿con qué correo entraba a esto?" → cuentas enlazadas "inicia sesión con"; teclear la contraseña maestra todo el día → Touch ID / Face ID).
4. **Capturas**: tabla 2×3 con `client-drawer`, `command-palette`, `lock-biometric`, `clients`, `services`, `mobile`.
5. **Características**: lista del README actual más panel lateral, desbloqueo biométrico y `seed:demo`.
6. **Modelo de seguridad**: diagrama Mermaid `flowchart LR` con las dos rutas hacia la DEK (contraseña maestra → PBKDF2 600k → KEK; passkey + biometría → PRF → HKDF → KEK del dispositivo) y la DEK cifrando credenciales con AAD; debajo, las viñetas del README actual (qué no se cifra, sin recuperación, RLS) y enlace a `SECURITY.md`.
7. **Inicio rápido**: los 6 pasos actuales, con el paso 1 aplicando `0001_boveda.sql` **y** `0002_passkeys.sql`, más un paso opcional `npm run seed:demo`.
8. **Despliegue**: texto actual más: "El desbloqueo biométrico está ligado al dominio: si cambias de dominio, entra con tu contraseña maestra y vuelve a registrar el dispositivo."
9. **Compatibilidad biométrica**: tabla (Safari 18+ macOS/iOS, Chrome/Edge 116+, Android Chrome, Firefox: según versión).
10. **Estructura del proyecto**: bloque actual más `passkey.ts`, `CredentialDrawer.tsx`, `SecurityDialog.tsx`, `0002_passkeys.sql`, `scripts/seed-demo.mts`.
11. **Roadmap**: las 4 ideas actuales como casillas, más "Extensión de navegador para autocompletar" e "Internacionalización de la interfaz (hoy solo español)".
12. **Contribuir**: 3 líneas y enlace a `CONTRIBUTING.md`; mencionar que la interfaz está en español y que se aceptan traducciones.
13. **Licencia**: MIT. Pie: "Hecho en México por Yair Hernandez".

No incluir en ningún README la URL de despliegue de Yair, su proyecto Supabase ni su correo.

- [ ] **Step 2: Documentos**

- `LICENSE`: texto MIT estándar, `Copyright (c) 2026 Yair Hernandez`.
- `CONTRIBUTING.md` (inglés con resumen en español al inicio): requisitos (Node 22+, proyecto Supabase propio), puesta en marcha con `seed:demo`, comandos (`typecheck`, `test:crypto`, `build`), convención de commits (`feat:`, `fix:`, `docs:`, `chore:` en español o inglés), reglas: todo cambio en `src/lib/crypto.ts` o `src/lib/passkey.ts` exige prueba en `scripts/test-crypto.mts` y descripción del impacto en el modelo de amenazas; no añadir dependencias sin justificarlo; estilos con los tokens de `tokens.css`; cómo añadir un servicio al catálogo (`src/lib/presets.ts`, una línea, logo de SVGL).
- `SECURITY.md`: versiones soportadas (rama `main`); reporte privado por GitHub Security Advisories ("Report a vulnerability" en la pestaña Security), sin issues públicos; plazo de respuesta objetivo de 7 días; modelo de amenazas: qué protege (base filtrada, respaldo filtrado, service role, operador de Supabase), qué no (dispositivo comprometido o extensión maliciosa con la bóveda abierta, XSS, contraseña maestra débil), metadatos sin cifrar (lista exacta del README), detalle del desbloqueo biométrico (PRF, HKDF, AAD, reto generado en cliente y por qué la aserción no se verifica en servidor, revocación).
- `CODE_OF_CONDUCT.md`: Contributor Covenant 2.1 íntegro, contacto vía GitHub Security Advisories o issue privado.

- [ ] **Step 3: GitHub**

`.github/workflows/ci.yml`:

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
permissions:
  contents: read
jobs:
  check:
    runs-on: ubuntu-latest
    env:
      NEXT_PUBLIC_SUPABASE_URL: https://example.supabase.co
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: sb_publishable_ci_placeholder
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run typecheck
      - run: npm run test:crypto
      - run: npm run build
```

`bug_report.yml` (campos: qué pasó, pasos, esperado, navegador y sistema, ¿afecta al cifrado o al desbloqueo? con aviso de usar `SECURITY.md` si es una vulnerabilidad), `feature_request.yml` (problema, propuesta, alternativas), `config.yml` (`blank_issues_enabled: false`, enlace de contacto a Security Advisories), `pull_request_template.md` (qué cambia, cómo se probó, casillas: typecheck, test:crypto, capturas si hay UI, sin secretos).

- [ ] **Step 4: `package.json` y `.env.example`**

`package.json`: añadir `"description": "Las credenciales de todos tus clientes en un solo lugar, cifradas de extremo a extremo."`, `"license": "MIT"`, `"repository": { "type": "git", "url": "git+https://github.com/yairhdz24/boveda7k.git" }`, `"homepage": "https://github.com/yairhdz24/boveda7k#readme"`. Mantener `"private": true` (evita publicar a npm por accidente).

`.env.example`: añadir al final, comentadas, las tres variables `BOVEDA_DEMO_*` con una línea que explique `npm run seed:demo`.

- [ ] **Step 5: Verificar**

Run: `npm run typecheck && npm run test:crypto && npm run build`
Expected: todo en verde.

Run: `git grep -n -i -E "supabase\.co|sb_publishable_|sb_secret_|@gmail\.com|levelai" -- . ':!package-lock.json'`
Expected: solo `example.supabase.co`, los marcadores de `.env.example`/CI y los valores ficticios de `seed-demo.mts`. Además, buscar la referencia real del proyecto (leída de `.env.local`, sin imprimirla en el commit) con `git grep` y en todo el historial con `git log -S`; debe dar cero resultados.

Comprobar que todas las rutas de imagen del README existen: `grep -o 'docs/screenshots/[a-z-]*\.png' README.md README.es.md | sort -u | cut -d: -f2 | xargs ls`.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "docs: README bilingüe, guías de comunidad, licencia MIT y CI"
```

- [ ] **Step 7 (acciones externas, confirmar con Yair)**

`git push -u origin feat/drawer-biometria-oss`, abrir PR hacia `main`, y `gh repo edit yairhdz24/boveda7k --description "…" --add-topic password-manager --add-topic freelancers --add-topic nextjs --add-topic supabase --add-topic end-to-end-encryption --add-topic webauthn --add-topic passkeys`.

---

## Autorevisión del plan

- **Cobertura del spec**: panel lateral (T1), envoltura y pruebas (T2), migración y datos (T3), WebAuthn (T4), estado (T5), pantalla de bloqueo, oferta y seguridad (T6), datos de ejemplo (T7), capturas (T8), README, documentos, licencia, CI y revisión de fugas (T9). Posicionamiento de nicho: T9 pasos 1.1 a 1.3.
- **Diferencia respecto al spec**: el spec decía que "jumpTo" quitaba filtros; con el panel ya no hace falta porque el panel muestra la credencial aunque el filtro oculte su tarjeta.
- **Tipos**: `PasskeyWrap` (T2) es subconjunto estructural de `PasskeyRecord` (T3), por eso `unwrapDekWithSecret(secret, row, credentialId)` acepta la fila directamente en T5.
