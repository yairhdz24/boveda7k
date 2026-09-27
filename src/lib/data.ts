"use client";

import { supabaseBrowser } from "./supabase/client";
import { decryptJSON, encryptJSON, type VaultKeyRecord } from "./crypto";
import { SERVICE_PRESETS } from "./presets";
import type { Client, Credential, CredentialRow, CredentialSecret, Env, Service, ServiceKind } from "./types";

const db = () => supabaseBrowser();

function check<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}


/* ── Llave de la bóveda ─────────────────────────────────────── */
export async function getVaultKey(): Promise<VaultKeyRecord | null> {
  return check(await db().from("vault_keys").select("kdf_salt,kdf_iterations,wrapped_key,wrap_iv").maybeSingle());
}
export async function saveVaultKey(record: VaultKeyRecord) {
  check(await db().from("vault_keys").insert(record));
}
export async function replaceVaultKey(record: VaultKeyRecord) {
  const { data: { user } } = await db().auth.getUser();
  check(await db().from("vault_keys").update(record).eq("owner_id", user!.id));
}

/* ── Clientes ───────────────────────────────────────────────── */
export async function listClients(): Promise<Client[]> {
  return check(await db().from("clients_with_counts").select("*").eq("archived", false).order("name"));
}
export async function getClient(id: string): Promise<Client | null> {
  return check(await db().from("clients").select("*").eq("id", id).maybeSingle());
}
export type ClientInput = { name: string; website_url: string | null; logo_url: string | null; notes: string | null };
export async function createClient(input: ClientInput): Promise<Client> {
  return check(await db().from("clients").insert(input).select().single());
}
export async function updateClient(id: string, input: Partial<ClientInput>) {
  check(await db().from("clients").update(input).eq("id", id));
}
export async function deleteClient(id: string) {
  check(await db().from("clients").delete().eq("id", id));
}

/* ── Servicios ──────────────────────────────────────────────── */
export async function listServices(): Promise<Service[]> {
  return check(await db().from("services").select("*").order("name"));
}
export type ServiceInput = { name: string; logo_url: string | null; category: string | null; kind: ServiceKind; login_url: string | null };
export async function createService(input: ServiceInput): Promise<Service> {
  return check(await db().from("services").insert(input).select().single());
}
export async function updateService(id: string, input: Partial<ServiceInput>) {
  check(await db().from("services").update(input).eq("id", id));
}
export async function deleteService(id: string) {
  check(await db().from("services").delete().eq("id", id));
}
export async function seedDefaultServices() {
  const existing = await listServices();
  if (existing.length) return;
  check(await db().from("services").insert(SERVICE_PRESETS));
}

/* ── Credenciales (cifradas) ────────────────────────────────── */
async function decryptRow(dek: CryptoKey, row: CredentialRow): Promise<Credential> {
  const { payload, ...rest } = row;
  try {
    const secret = await decryptJSON<CredentialSecret>(dek, payload, row.id);
    return { ...rest, secret };
  } catch {
    return { ...rest, secret: null, decryptError: true };
  }
}

export async function listCredentials(dek: CryptoKey, clientId?: string): Promise<Credential[]> {
  let q = db().from("credentials").select("*").order("title");
  if (clientId) q = q.eq("client_id", clientId);
  const rows = check(await q) as CredentialRow[];
  return Promise.all(rows.map((r) => decryptRow(dek, r)));
}

export type CredentialInput = {
  client_id: string;
  service_id: string | null;
  title: string;
  environment: Env;
  login_url: string | null;
  secret: CredentialSecret;
  rotated?: boolean;
};

export async function saveCredential(dek: CryptoKey, input: CredentialInput, id?: string) {
  const credId = id ?? crypto.randomUUID();
  const payload = await encryptJSON(dek, input.secret, credId);
  const row = {
    client_id: input.client_id,
    service_id: input.service_id,
    title: input.title,
    environment: input.environment,
    login_url: input.login_url,
    payload,
    ...(input.rotated || !id ? { last_rotated_at: new Date().toISOString() } : {}),
  };
  if (id) check(await db().from("credentials").update(row).eq("id", id));
  else check(await db().from("credentials").insert({ id: credId, ...row }));
}

export async function deleteCredential(id: string) {
  check(await db().from("credentials").delete().eq("id", id));
}

/* ── Logos (Storage) ────────────────────────────────────────── */
export async function uploadLogo(file: File): Promise<string> {
  if (file.size > 1024 * 1024) throw new Error("El logo pesa más de 1 MB.");
  const { data: { user } } = await db().auth.getUser();
  const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${user!.id}/${crypto.randomUUID()}.${ext}`;
  const { error } = await db().storage.from("logos").upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new Error(error.message);
  return db().storage.from("logos").getPublicUrl(path).data.publicUrl;
}

/* ── Sesión ─────────────────────────────────────────────────── */
export async function currentEmail(): Promise<string> {
  const { data } = await db().auth.getUser();
  return data.user?.email ?? "";
}
export async function signOut() {
  await db().auth.signOut();
  location.href = "/login";
}

