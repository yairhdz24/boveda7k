// Datos de ejemplo cifrados: npm run seed:demo
// Requiere en .env.local: BOVEDA_DEMO_EMAIL, BOVEDA_DEMO_PASSWORD y BOVEDA_DEMO_MASTER (≥ 12 caracteres).
// El usuario debe existir ya en Supabase Auth. Si ya tiene clientes, no hace nada.
import { createClient } from "@supabase/supabase-js";
import { createVault, unlockVault, encryptJSON } from "../src/lib/crypto.ts";
import { SERVICE_PRESETS } from "../src/lib/presets.ts";

const env = (k: string): string => {
  const v = process.env[k];
  if (!v) {
    console.error(`Falta ${k} en .env.local`);
    process.exit(1);
  }
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
if (authError) {
  console.error(`No se pudo iniciar sesión: ${authError.message}`);
  process.exit(1);
}

if (ok(await db.from("clients").select("id").limit(1))!.length) {
  console.log("Este usuario ya tiene clientes: no se sembró nada.");
  process.exit(0);
}

// Bóveda: se crea con la contraseña maestra demo si aún no existe
const existing = ok(await db.from("vault_keys").select("kdf_salt,kdf_iterations,wrapped_key,wrap_iv").maybeSingle());
let dek: CryptoKey;
if (existing) dek = await unlockVault(master, existing);
else {
  const v = await createVault(master);
  ok(await db.from("vault_keys").insert(v.record));
  dek = v.dek;
}

// Catálogo de servicios (lo mismo que hace la app en el primer arranque)
if (!ok(await db.from("services").select("id").limit(1))!.length) ok(await db.from("services").insert(SERVICE_PRESETS));
const services = ok(await db.from("services").select("id,name,login_url")) as { id: string; name: string; login_url: string | null }[];
const svc = (name: string) => services.find((s) => s.name === name);

type F = [label: string, value: string, secret?: boolean];
type Cred = { key: string; service: string; title: string; env?: "prod" | "staging" | "dev"; fields: F[]; notes?: string; via?: string; daysOld?: number };

// Todo es ficticio: dominios .example (RFC 2606) e IP de documentación (RFC 5737)
const CLIENTS: { name: string; website_url: string; notes: string; creds: Cred[] }[] = [
  {
    name: "Café Nómada",
    website_url: "https://cafenomada.example",
    notes: "Cafetería de especialidad. Sitio en WordPress y tienda en línea.",
    creds: [
      { key: "g", service: "Gmail / Google Workspace", title: "Cuenta principal del negocio", fields: [["Correo", "hola@cafenomada.example"], ["Contraseña", "Tueste-Medio_2026!", true], ["Códigos de respaldo 2FA", "4821 9930\n1177 0452\n6603 2298", true]], notes: "La dueña tiene el 2FA en su teléfono; avisar antes de entrar." },
      { key: "gtm", service: "Google Tag Manager", title: "Contenedor web", fields: [["ID del contenedor", "GTM-N0MADA1"]], via: "g" },
      { key: "ga", service: "Google Analytics", title: "Propiedad GA4", fields: [["ID de medición", "G-7K2Q9XWB41"]], via: "g" },
      { key: "wp", service: "WordPress", title: "Administrador del sitio", fields: [["Usuario / correo", "admin-nomada"], ["Contraseña", "Wp#Cafe-Molido-55", true]] },
      { key: "host", service: "Hostinger", title: "Hosting y dominio", fields: [["Usuario / correo", "hola@cafenomada.example"], ["Contraseña", "h0st-Nomada#88", true]], daysOld: 140 },
      { key: "ig", service: "Instagram", title: "@cafenomada", fields: [["Usuario / correo", "cafenomada"], ["Contraseña", "espresso.doble.77", true]] },
    ],
  },
  {
    name: "Estudio Lumen",
    website_url: "https://estudiolumen.example",
    notes: "Despacho de arquitectura. App interna en Next.js + Supabase.",
    creds: [
      { key: "gh", service: "GitHub", title: "Organización estudio-lumen", fields: [["Usuario / correo", "dev@estudiolumen.example"], ["Contraseña", "Git-Lumen_Planos9", true], ["Llave secreta / token", "ghp_token-ficticio-demo", true]] },
      { key: "sb", service: "Supabase", title: "Proyecto de producción", fields: [["Llave secreta / token", "sb_secret_DEMO_9f2c1a7e44b0", true]], notes: "La llave secreta solo se usa en el cron de respaldos.", via: "gh" },
      { key: "db", service: "Supabase", title: "Postgres directo", env: "staging", fields: [["Host", "db.lumen-staging.example"], ["Puerto", "5432"], ["Base de datos", "postgres"], ["Usuario", "postgres"], ["Contraseña", "pg-Staging-Lumen-5531", true]] },
      { key: "vc", service: "Vercel", title: "Equipo Lumen", fields: [], via: "gh" },
      { key: "cf", service: "Cloudflare", title: "DNS y SSL", fields: [["Usuario / correo", "dev@estudiolumen.example"], ["Contraseña", "nube.Naranja-19", true], ["Llave secreta / token", "cf_demo_3b8d0e61a2", true]] },
    ],
  },
  {
    name: "Tacos El Güero",
    website_url: "https://tacoselguero.example",
    notes: "Restaurante con pedidos por WhatsApp. Landing y automatizaciones.",
    creds: [
      { key: "meta", service: "Meta Business Suite", title: "Portafolio comercial", fields: [["Usuario / correo", "guero@tacoselguero.example"], ["Contraseña", "Pastor-con-Pina_3", true]] },
      { key: "ntl", service: "Netlify", title: "Landing de pedidos", fields: [["Usuario / correo", "guero@tacoselguero.example"], ["Contraseña", "netl1fy-Trompo!", true]] },
      { key: "n8n", service: "n8n", title: "Automatización de pedidos", env: "dev", fields: [["Usuario / correo", "guero@tacoselguero.example"], ["Contraseña", "flujo-Trompo_n8n", true], ["URL / Endpoint", "https://n8n.tacoselguero.example"]] },
      { key: "vps", service: "Hetzner", title: "VPS de automatizaciones", fields: [["Host / IP", "203.0.113.24"], ["Puerto SSH", "22"], ["Usuario", "root"], ["Contraseña", "S4lsa-Verde-root", true]], daysOld: 200 },
    ],
  },
  {
    name: "Clínica Aurora",
    website_url: "https://clinicaaurora.example",
    notes: "Clínica dental. Agenda en línea y campañas de Google Ads.",
    creds: [
      { key: "g", service: "Gmail / Google Workspace", title: "Recepción", fields: [["Correo", "recepcion@clinicaaurora.example"], ["Contraseña", "Sonrisa.Blanca_61", true]] },
      { key: "ads", service: "Google Ads", title: "Cuenta publicitaria", fields: [["ID de cliente", "481-220-9917"]], via: "g" },
      { key: "gbp", service: "Google Business Profile", title: "Ficha de la clínica", fields: [], via: "g" },
      { key: "st", service: "Stripe", title: "Cobros de anticipos", fields: [["Usuario / correo", "admin@clinicaaurora.example"], ["Contraseña", "Cobro-Seguro_Aurora7", true], ["Llave secreta / token", "sk_test_llave-ficticia-demo", true]] },
    ],
  },
];

let total = 0;
for (const c of CLIENTS) {
  const client = ok(await db.from("clients").insert({ name: c.name, website_url: c.website_url, logo_url: null, notes: c.notes }).select("id").single()) as { id: string };
  // Los ids se generan aquí: son el AAD del cifrado y permiten enlazar cuentas ("inicia sesión con")
  const ids = new Map(c.creds.map((k) => [k.key, crypto.randomUUID()]));
  for (const k of c.creds) {
    const id = ids.get(k.key)!;
    const secret = { fields: k.fields.map(([label, value, secret = false]) => ({ label, value, secret })), ...(k.notes ? { notes: k.notes } : {}), ...(k.via ? { via: ids.get(k.via) } : {}) };
    const when = new Date(Date.now() - (k.daysOld ?? 3) * 86_400_000).toISOString();
    ok(await db.from("credentials").insert({ id, client_id: client.id, service_id: svc(k.service)?.id ?? null, title: k.title, environment: k.env ?? "prod", login_url: svc(k.service)?.login_url ?? null, payload: await encryptJSON(dek, secret, id), last_rotated_at: when }));
    total++;
  }
}
console.log(`✓ ${CLIENTS.length} clientes y ${total} credenciales de ejemplo, cifradas con la contraseña maestra demo.`);
