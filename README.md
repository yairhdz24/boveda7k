# Bóveda

Herramienta interna para guardar las credenciales de cada cliente — cuentas de Google, bases de datos, servidores, tokens — en un solo lugar y **cifradas de extremo a extremo**.

Next.js 15 (App Router) · Supabase (Auth + Postgres + Storage) · Web Crypto · diseño del Design System **Bóveda** (negro + verde, Sora / Manrope / Geist Mono).

## Qué hace

- **Clientes** con logo, sitio web y notas. El logo se busca en [SVGL](https://svgl.app), se sube o se toma del favicon del sitio.
- **Servicios**: catálogo de más de 180 plataformas (Google Tag Manager, Supabase, Gmail, Hetzner, Vercel, Cloudflare…) con logos de SVGL, URL de acceso y plantilla de campos según el tipo (cuenta, correo, base de datos, servidor SSH, API).
- **Credenciales** por cliente y servicio, con entorno (Producción / Staging / Dev), campos libres (secretos o no), generador de contraseñas y notas cifradas.
- Revelar se oculta solo a los 20 s; copiar limpia el portapapeles a los 30 s.
- **⌘K / Ctrl K**: busca clientes y credenciales y copia la contraseña sin abrir nada.
- Aviso "Rotar pronto" cuando una credencial lleva más de 90 días sin rotarse.
- Auto-bloqueo tras 15 min de inactividad y al recargar la página. Tema Noche / Día.

## Seguridad (modelo de cifrado)

```
contraseña maestra ──PBKDF2-SHA256, 600 000 iteraciones──▶ KEK
DEK aleatoria AES-256-GCM ──envuelta con la KEK──▶ tabla vault_keys
cada credencial ──AES-256-GCM con la DEK (AAD = id de la credencial)──▶ credentials.payload
```

- Todo se cifra **en el navegador**. Supabase solo guarda texto cifrado: ni la base, ni un backup filtrado, ni la service role pueden leer tus contraseñas.
- La DEK vive solo en memoria y no es extraíble. Cambiar la contraseña maestra solo re-envuelve la DEK (no hay que recifrar todo).
- **Si olvidas la contraseña maestra no hay recuperación.** Guárdala fuera de la app.
- Lo que **no** se cifra: nombre y sitio del cliente, notas del cliente, nombre del servicio, título y entorno de la credencial y la URL de acceso (para poder listar y filtrar). No pongas secretos ahí.
- RLS en todas las tablas: cada usuario solo ve lo suyo.

## Puesta en marcha

1. **Crea un proyecto en Supabase** y aplica la migración:
   - Desde el SQL Editor pega `supabase/migrations/0001_boveda.sql`, o
   - con la CLI: `supabase link --project-ref <ref> && supabase db push`.
2. **Crea tu usuario**: Authentication → Users → *Add user* (correo + contraseña, marca *Auto confirm*).
3. **Desactiva los registros públicos**: Authentication → Sign In / Providers → desactiva *Allow new users to sign up*. Es una herramienta interna.
4. Variables de entorno:
   ```bash
   cp .env.example .env   # o .env.local
   # NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (Project Settings → API)
   ```
5. Corre:
   ```bash
   npm install
   npm run dev          # http://localhost:3000
   npm run test:crypto  # pruebas del cifrado
   ```
6. Entra con tu cuenta, crea tu **contraseña maestra** (el catálogo de servicios se carga solo) y da de alta tu primer cliente.

### Desplegar

Vercel o tu VPS (Hetzner) con `npm run build && npm start`. Usa siempre HTTPS: Web Crypto y el portapapeles lo requieren. Si lo pones en tu VPS, protégelo además detrás de Cloudflare Access o una IP permitida.

## Estructura

```
supabase/migrations/0001_boveda.sql   tablas, RLS, vista de conteos, bucket de logos
src/lib/crypto.ts                     cifrado (PBKDF2 + AES-GCM), generador de contraseñas
src/lib/vault.tsx                     estado de la bóveda, auto-bloqueo, portapapeles, toasts
src/lib/data.ts                       acceso a Supabase (cifra/descifra credenciales)
src/lib/presets.ts                    catálogo de servicios + buscador SVGL
src/components/ui/                    Button, Field, SecretField, LogoTile, Badge, Dialog…
src/components/forms/                 diálogos de cliente, servicio y credencial
src/app/tokens.css                    tokens del Design System Bóveda
src/app/(vault)/                      Clientes, detalle de cliente, Servicios
```

## Ideas siguientes

- Exportar un respaldo cifrado (JSON) y restaurarlo.
- Compartir un cliente con un socio (envolver la DEK con su llave pública).
- Historial de cambios por credencial.
- Guardar códigos TOTP y mostrar el código de 6 dígitos en vivo.
