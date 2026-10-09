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
/** Copia propia del secreto, sea ArrayBuffer o vista. */
function bytes(b: BufferSource): Uint8Array<ArrayBuffer> {
  const view = ArrayBuffer.isView(b) ? new Uint8Array(b.buffer, b.byteOffset, b.byteLength) : new Uint8Array(b);
  const out = new Uint8Array(new ArrayBuffer(view.byteLength));
  out.set(view);
  return out;
}

export class PasskeyCancelledError extends Error {
  constructor() {
    super("Desbloqueo cancelado.");
    this.name = "PasskeyCancelledError";
  }
}
export class PasskeyUnsupportedError extends Error {
  constructor() {
    super("Este navegador o dispositivo no permite desbloqueo biométrico cifrado.");
    this.name = "PasskeyUnsupportedError";
  }
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
        user: { id: enc.encode(user.id), name: user.email, displayName: user.email },
        pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
        authenticatorSelection: { authenticatorAttachment: "platform", residentKey: "preferred", userVerification: "required" },
        // Un dispositivo ya registrado no se registra dos veces
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
