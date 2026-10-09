/**
 * Cifrado de extremo a extremo de la bóveda (Web Crypto, en el navegador).
 *
 *  contraseña maestra ──PBKDF2-SHA256 (600k)──▶ KEK (AES-256-GCM, solo wrap/unwrap)
 *  DEK aleatoria (AES-256-GCM) ──envuelta con KEK──▶ vault_keys.wrapped_key
 *  cada credencial ──AES-GCM con DEK, AAD = id de la credencial──▶ credentials.payload
 *  passkey (PRF) ──HKDF-SHA256──▶ KEK del dispositivo ──envuelve la misma DEK──▶ vault_passkeys
 *
 * La DEK solo existe en memoria mientras la bóveda está desbloqueada y es no extraíble.
 */

export const KDF_ITERATIONS = 600_000;
const enc = new TextEncoder();
const dec = new TextDecoder();

export type VaultKeyRecord = {
  kdf_salt: string;
  kdf_iterations: number;
  wrapped_key: string;
  wrap_iv: string;
};

export type EncryptedPayload = { v: 1; iv: string; ct: string };

export function toB64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

export function fromB64(b64: string): Uint8Array<ArrayBuffer> {
  const s = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(s.length));
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

function randomBytes(n: number): Uint8Array<ArrayBuffer> {
  return crypto.getRandomValues(new Uint8Array(new ArrayBuffer(n)));
}

async function deriveKek(master: string, salt: Uint8Array<ArrayBuffer>, iterations: number): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey("raw", enc.encode(master.normalize("NFKC")), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["wrapKey", "unwrapKey"],
  );
}

const WRAP_AAD = enc.encode("boveda:dek:v1");

/** Crea una bóveda nueva: devuelve el registro a guardar y la DEK lista para usar. */
export async function createVault(master: string): Promise<{ record: VaultKeyRecord; dek: CryptoKey }> {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const kek = await deriveKek(master, salt, KDF_ITERATIONS);
  const exportable = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
  const wrapped = await crypto.subtle.wrapKey("raw", exportable, kek, { name: "AES-GCM", iv, additionalData: WRAP_AAD });
  const record: VaultKeyRecord = { kdf_salt: toB64(salt), kdf_iterations: KDF_ITERATIONS, wrapped_key: toB64(wrapped), wrap_iv: toB64(iv) };
  // Reabrimos como no extraíble para el uso normal.
  const dek = await unlockVault(master, record);
  return { record, dek };
}

/** Desbloquea: lanza WrongMasterPasswordError si la contraseña no es la correcta. */
export async function unlockVault(master: string, record: VaultKeyRecord, extractable = false): Promise<CryptoKey> {
  const kek = await deriveKek(master, fromB64(record.kdf_salt), record.kdf_iterations);
  try {
    return await crypto.subtle.unwrapKey(
      "raw",
      fromB64(record.wrapped_key),
      kek,
      { name: "AES-GCM", iv: fromB64(record.wrap_iv), additionalData: WRAP_AAD },
      { name: "AES-GCM", length: 256 },
      extractable,
      ["encrypt", "decrypt"],
    );
  } catch {
    throw new WrongMasterPasswordError();
  }
}

/** Cambia la contraseña maestra sin volver a cifrar las credenciales (solo re-envuelve la DEK). */
export async function rewrapVault(oldMaster: string, newMaster: string, record: VaultKeyRecord): Promise<VaultKeyRecord> {
  const dek = await unlockVault(oldMaster, record, true);
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const kek = await deriveKek(newMaster, salt, KDF_ITERATIONS);
  const wrapped = await crypto.subtle.wrapKey("raw", dek, kek, { name: "AES-GCM", iv, additionalData: WRAP_AAD });
  return { kdf_salt: toB64(salt), kdf_iterations: KDF_ITERATIONS, wrapped_key: toB64(wrapped), wrap_iv: toB64(iv) };
}

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

export async function encryptJSON(dek: CryptoKey, data: unknown, aad: string): Promise<EncryptedPayload> {
  const iv = randomBytes(12);
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: enc.encode(aad) }, dek, enc.encode(JSON.stringify(data)));
  return { v: 1, iv: toB64(iv), ct: toB64(ct) };
}

export async function decryptJSON<T>(dek: CryptoKey, payload: EncryptedPayload, aad: string): Promise<T> {
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromB64(payload.iv), additionalData: enc.encode(aad) }, dek, fromB64(payload.ct));
  return JSON.parse(dec.decode(pt)) as T;
}

export class WrongMasterPasswordError extends Error {
  constructor() {
    super("Contraseña maestra incorrecta. Inténtalo de nuevo.");
    this.name = "WrongMasterPasswordError";
  }
}

/** Generador de contraseñas sin sesgo de módulo. */
export function generatePassword(length = 24, opts = { symbols: true }): string {
  const sets = ["ABCDEFGHJKLMNPQRSTUVWXYZ", "abcdefghijkmnopqrstuvwxyz", "23456789"];
  if (opts.symbols) sets.push("!@#$%^&*-_=+?");
  const all = sets.join("");
  const pick = (chars: string) => {
    const limit = 256 - (256 % chars.length);
    for (;;) {
      const b = crypto.getRandomValues(new Uint8Array(1))[0];
      if (b < limit) return chars[b % chars.length];
    }
  };
  const out = sets.map(pick); // al menos uno de cada grupo
  while (out.length < length) out.push(pick(all));
  for (let i = out.length - 1; i > 0; i--) {
    const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out.join("");
}

/** Fuerza aproximada (bits de entropía) para la contraseña maestra. */
export function estimateStrength(pw: string): { bits: number; label: "Débil" | "Aceptable" | "Fuerte" | "Excelente" } {
  let pool = 0;
  if (/[a-z]/.test(pw)) pool += 26;
  if (/[A-Z]/.test(pw)) pool += 26;
  if (/[0-9]/.test(pw)) pool += 10;
  if (/[^a-zA-Z0-9]/.test(pw)) pool += 33;
  const bits = Math.round(pw.length * Math.log2(Math.max(pool, 1)));
  const label = bits < 50 ? "Débil" : bits < 70 ? "Aceptable" : bits < 100 ? "Fuerte" : "Excelente";
  return { bits, label };
}
