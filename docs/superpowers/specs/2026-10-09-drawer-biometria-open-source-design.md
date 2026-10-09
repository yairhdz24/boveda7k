# Bóveda: panel lateral, desbloqueo biométrico y apertura a la comunidad

Fecha: 2026-10-09 · Estado: pendiente de revisión

## Objetivo

Tres entregas independientes, en este orden (las capturas del README deben mostrar la interfaz final):

1. **Panel lateral de credenciales**: que ningún título se corte y el detalle se abra y cierre como un drawer.
2. **Desbloqueo biométrico**: Touch ID, Face ID o Windows Hello en lugar de teclear la contraseña maestra cada vez que la bóveda se bloquea.
3. **Open source**: README bilingüe con capturas, documentación de comunidad, licencia MIT y CI, sin publicar nada del proyecto Supabase de Yair.

Decisiones ya tomadas por Yair: panel lateral, capturas con una cuenta demo en su Supabase, licencia MIT, README en inglés más español.

Fuera de alcance: migrar a Tailwind/shadcn (se respeta el Design System Bóveda en CSS propio), compartir bóvedas entre usuarios, cambiar el tiempo de auto-bloqueo (sigue en 15 min).

---

## 1. Panel lateral de credenciales

### Problema

`.cred-grid` usa `minmax(280px, 1fr)`. Dentro de 280px caben logo (44), badge de entorno, flecha y dos botones de copiado, y al título le quedan unos 20px: se ve "C…".

### Diseño

- **`CredentialCard`** pasa a ser una tarjeta compacta que no se expande. Dos filas:
  - fila 1: logo, título (hasta 2 líneas, sin `nowrap`), servicio;
  - fila 2: usuario o "con <cuenta vinculada>" a la izquierda; badge de entorno, indicador de rotación y botones de copiar usuario y contraseña a la derecha.
  - La rejilla sube a `minmax(300px, 1fr)`. Toda la tarjeta es el botón que abre el panel; los botones de copiado no lo abren.
- **`CredentialDrawer`** (componente nuevo, `src/components/CredentialDrawer.tsx`): recibe lo que hoy recibe el cuerpo expandido de la tarjeta (credencial, servicio, `via`, `usedBy`, `onEdit`, `onDelete`, `onJump`, `onClose`).
  - `<dialog>` modal, igual que el `Dialog` existente: fondo atenuado, `Esc` y clic fuera cierran, el foco vuelve a la tarjeta.
  - Escritorio: 460px anclado a la derecha, alto completo, entra deslizándose (240 ms). Móvil (≤ 720px): hoja inferior a pantalla casi completa.
  - Contenido: cabecera con logo, título, servicio y badge; enlace "Abrir login"; bloque "Inicia sesión con"; campos con `SecretField`; notas; "Se usa para entrar a"; pie con fechas y acciones Editar / Eliminar.
  - Respeta `prefers-reduced-motion`.
- **Página de cliente**: el estado `open: Set<string>` se sustituye por `selected: string | null`. Se elimina "Expandir todo / Contraer todo". El hash `#c-<id>` (viene de ⌘K) abre el panel. `jumpTo` cambia la credencial mostrada en el panel sin cerrarlo.

### Verificación

Typecheck y revisión visual en Chrome a 1440, 1024 y 390px con títulos largos; teclado: `Tab`, `Enter`, `Esc`.

---

## 2. Desbloqueo biométrico (WebAuthn + PRF)

### Modelo

La biometría no sustituye al cifrado: añade una segunda forma de obtener la misma DEK.

```
contraseña maestra ──PBKDF2──▶ KEK ──────────────┐
                                                 ├──▶ DEK (la misma)
passkey + huella/rostro ──PRF──▶ secreto 32 B    │
        └──HKDF-SHA256──▶ KEK del dispositivo ───┘
```

- Cada dispositivo registra una passkey de plataforma con la extensión `prf`. Al autenticarse con verificación de usuario, el autenticador devuelve un secreto de 32 bytes determinista para esa passkey y ese salt.
- De ese secreto se deriva con HKDF-SHA256 (`info = "boveda:passkey-kek:v1"`) una llave AES-256-GCM que envuelve la DEK. AAD: `"boveda:dek:passkey:v1:" + credential_id`.
- Supabase guarda solo la DEK envuelta. Sin el dispositivo y la biometría no se puede abrir. El modelo de extremo a extremo no cambia.
- El reto (`challenge`) se genera en el cliente y la aserción no se verifica en servidor: la frontera de seguridad es el secreto PRF, no la firma. Se documenta en `SECURITY.md`.
- La contraseña maestra sigue siendo el respaldo y la única forma de registrar un dispositivo (se necesita la DEK extraíble para envolverla).
- Cambiar la contraseña maestra no invalida las passkeys, porque la DEK no cambia.
- La passkey queda ligada al dominio (`rp.id = location.hostname`). Si el despliegue cambia de dominio, se entra con la contraseña maestra y se vuelve a registrar.

### Datos: migración `0002_passkeys.sql`

```sql
create table public.vault_passkeys (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  credential_id  text not null unique,     -- base64url, id de la passkey
  prf_salt       text not null,            -- base64, 32 bytes
  wrapped_key    text not null,            -- base64, DEK envuelta
  wrap_iv        text not null,            -- base64
  label          text not null,            -- "MacBook · Touch ID"
  created_at     timestamptz not null default now(),
  last_used_at   timestamptz
);
```

Con RLS `owner_id = auth.uid()` para todas las operaciones, igual que el resto de tablas.

### Código

| Unidad | Responsabilidad |
| --- | --- |
| `src/lib/crypto.ts` | `wrapDekWithSecret(dek, secret, credentialId)` y `unwrapDekWithSecret(secret, record, credentialId)`. Puro, sin DOM, probado en Node. |
| `src/lib/passkey.ts` (nuevo) | Único archivo que toca `navigator.credentials`. `passkeySupport()`, `registerPasskey(user)` → `{ credentialId, prfSalt, secret }`, `assertPasskey(records)` → `{ credentialId, secret }`, y `deviceLabel()`. |
| `src/lib/data.ts` | `listPasskeys`, `savePasskey`, `deletePasskey`, `touchPasskey`. |
| `src/lib/vault.tsx` | Estado `passkeys` y acciones `unlockWithPasskey()`, `enrollPasskey(master)`, `removePasskey(id)`. |
| `src/components/VaultGate.tsx` | Pantalla de bloqueo con botón biométrico y oferta de activación. |
| `src/components/SecurityDialog.tsx` (nuevo) | Lista de dispositivos, alta y revocación. Se abre desde `Shell`. |

Detalles de `passkey.ts`:

- Registro: `authenticatorAttachment: "platform"`, `residentKey: "preferred"`, `userVerification: "required"`, `extensions: { prf: { eval: { first: salt } } }`. Si el autenticador confirma `prf.enabled` pero no devuelve el resultado en la creación, se hace una aserción inmediata para obtenerlo (un segundo toque).
- Si `prf.enabled` no es `true`, se cancela el registro con un mensaje claro: "Este navegador o dispositivo no permite desbloqueo biométrico cifrado".
- Aserción: `allowCredentials` con todas las passkeys del usuario y `prf.evalByCredential` con el salt de cada una. Así una passkey sincronizada por iCloud Keychain funciona en el iPhone sin registrarla de nuevo.

### Experiencia

- **Pantalla de bloqueo con passkey registrada**: botón principal "Desbloquear con Touch ID" (el texto cambia según plataforma: Touch ID, Face ID, Windows Hello, "biometría"). Se lanza el prompt automáticamente una vez al aparecer la pantalla; si el navegador lo impide o el usuario cancela, no se muestra error y queda el botón. Debajo, "Usar contraseña maestra" despliega el formulario actual.
- **Sin passkey, en dispositivo compatible**: tras desbloquear con la contraseña maestra aparece una oferta única "Activar Touch ID en este dispositivo" que registra en un toque, reutilizando la contraseña recién tecleada. "Ahora no" la descarta para ese dispositivo (`localStorage`).
- **Seguridad** (nuevo acceso en `Shell`): lista de dispositivos con etiqueta, fecha de alta y último uso; "Revocar" borra la fila; "Agregar este dispositivo" pide la contraseña maestra.
- **No compatible** (sin WebAuthn, sin autenticador de plataforma o sin PRF): no se muestra nada biométrico.

### Errores

| Caso | Comportamiento |
| --- | --- |
| Usuario cancela el prompt | Sin error; sigue en la pantalla de bloqueo. |
| Passkey borrada del dispositivo | "No encontramos la llave de este dispositivo. Usa tu contraseña maestra." |
| La DEK envuelta no abre | Mismo mensaje; se sugiere revocar y registrar de nuevo. |
| Fila revocada desde otro dispositivo | El botón biométrico deja de aparecer al recargar las passkeys. |

### Compatibilidad

Safari 18+ en macOS 15 e iOS 18, Chrome y Edge 116+ con Touch ID o Windows Hello, Android con Chrome reciente. Firefox depende de la versión; al no anunciar PRF simplemente no se ofrece.

### Verificación

- `npm run test:crypto` ampliado: envolver y abrir con el secreto correcto, fallo con secreto distinto, fallo con `credential_id` distinto (AAD), y que la DEK resultante no sea extraíble.
- Typecheck y build.
- Prueba manual en Chrome con Touch ID real: registrar, bloquear, desbloquear, revocar. El toque del sensor lo hace Yair.

---

## 3. Apertura a la comunidad

### Qué se publica y qué no

- **No se publica**: `.env.local`, `.vercel`, la referencia o URL del proyecto Supabase de Yair, ni datos reales. Hoy ya es así; se añade una revisión final con `git grep` de la referencia del proyecto antes de cerrar.
- **Sí se publica**: `supabase/migrations/0001` y `0002`, genéricas, y un script de datos de ejemplo.

### Archivos

- `README.md` (inglés) y `README.es.md`, enlazados entre sí. Estructura: hero con logo y captura principal, insignias (licencia, CI, stack), por qué existe, galería de capturas, características, modelo de seguridad con diagrama Mermaid (incluida la biometría), inicio rápido en 5 pasos, despliegue, estructura del proyecto, roadmap, cómo contribuir, licencia.
- `LICENSE` (MIT, © 2026 Yair Hernandez).
- `CONTRIBUTING.md`: entorno local, convención de commits, reglas para tocar `crypto.ts` (toda modificación requiere prueba), cómo proponer servicios al catálogo.
- `SECURITY.md`: modelo de amenazas, qué queda sin cifrar, cómo reportar vulnerabilidades en privado (GitHub Security Advisories).
- `CODE_OF_CONDUCT.md` (Contributor Covenant 2.1).
- `.github/`: plantillas de issue (bug, propuesta), plantilla de PR y `workflows/ci.yml` (typecheck, `test:crypto` y build con variables de entorno ficticias).
- `package.json`: `description`, `license`, `repository`, `homepage` y script `seed:demo`.

### Datos de ejemplo y capturas

- `scripts/seed-demo.mts`: inicia sesión con un usuario (correo, contraseña y contraseña maestra por variables de entorno), crea la bóveda si no existe y carga 4 clientes ficticios con unas 14 credenciales cifradas con `crypto.ts`. Sirve a quien contribuye para tener datos al instante.
- Para las capturas: se crea un usuario demo en el Supabase de Yair, se siembra con el script, se captura en local con Chrome y al terminar se elimina el usuario (el borrado en cascada limpia sus datos).
- Capturas en `docs/screenshots/`: login, pantalla de bloqueo con biometría, lista de clientes, detalle de cliente con el panel lateral abierto, paleta ⌘K, catálogo de servicios y vista móvil. Tema noche, 2x.

### Acciones externas (se confirman antes de ejecutarlas)

- Aplicar `0002_passkeys.sql` al Supabase de Yair.
- Crear y borrar el usuario demo.
- `git push` y actualizar descripción y temas del repositorio en GitHub.

---

## Orden de implementación

1. Panel lateral (rama `feat/drawer-biometria-oss`).
2. Biometría: crypto y pruebas → migración → `passkey.ts` → estado → UI.
3. Open source: script de datos → capturas → README y documentos → CI.
