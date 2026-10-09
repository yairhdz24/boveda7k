import type { EncryptedPayload } from "./crypto";

export type Env = "prod" | "staging" | "dev";
export type ServiceKind = "login" | "database" | "server" | "api" | "email" | "other";

export type Client = {
  id: string;
  name: string;
  website_url: string | null;
  logo_url: string | null;
  notes: string | null;
  archived: boolean;
  created_at: string;
  updated_at: string;
  credential_count?: number;
};

export type Service = {
  id: string;
  name: string;
  logo_url: string | null;
  category: string | null;
  kind: ServiceKind;
  login_url: string | null;
};

export type CredentialRow = {
  id: string;
  client_id: string;
  service_id: string | null;
  title: string;
  environment: Env;
  login_url: string | null;
  payload: EncryptedPayload;
  last_rotated_at: string;
  created_at: string;
  updated_at: string;
};

/** Lo que va DENTRO del payload cifrado. */
export type SecretField = { label: string; value: string; secret: boolean };
/**
 * `via`: id de otra credencial con la que se inicia sesión (p. ej. la cuenta de Google del cliente
 * usada para entrar a Google Cloud o Tag Manager). Va dentro del payload cifrado, así que la base
 * no sabe qué cuentas están ligadas.
 */
export type CredentialSecret = { fields: SecretField[]; notes?: string; via?: string };

export type Credential = Omit<CredentialRow, "payload"> & { secret: CredentialSecret | null; decryptError?: boolean };

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

export const ENV_LABEL: Record<Env, string> = { prod: "Producción", staging: "Staging", dev: "Dev" };

export const KIND_LABEL: Record<ServiceKind, string> = {
  login: "Cuenta / panel",
  email: "Correo",
  database: "Base de datos",
  server: "Servidor",
  api: "API / Plataforma",
  other: "Otro",
};

export const FIELD_TEMPLATES: Record<ServiceKind, SecretField[]> = {
  login: [
    { label: "Usuario / correo", value: "", secret: false },
    { label: "Contraseña", value: "", secret: true },
  ],
  email: [
    { label: "Correo", value: "", secret: false },
    { label: "Contraseña", value: "", secret: true },
    { label: "Correo de recuperación", value: "", secret: false },
    { label: "Códigos de respaldo 2FA", value: "", secret: true },
  ],
  database: [
    { label: "Host", value: "", secret: false },
    { label: "Puerto", value: "5432", secret: false },
    { label: "Base de datos", value: "", secret: false },
    { label: "Usuario", value: "", secret: false },
    { label: "Contraseña", value: "", secret: true },
    { label: "Connection string", value: "", secret: true },
  ],
  server: [
    { label: "Host / IP", value: "", secret: false },
    { label: "Puerto SSH", value: "22", secret: false },
    { label: "Usuario", value: "root", secret: false },
    { label: "Contraseña", value: "", secret: true },
    { label: "Llave privada", value: "", secret: true },
  ],
  api: [
    { label: "Usuario / correo", value: "", secret: false },
    { label: "Contraseña", value: "", secret: true },
    { label: "URL / Endpoint", value: "", secret: false },
    { label: "Llave pública", value: "", secret: false },
    { label: "Llave secreta / token", value: "", secret: true },
  ],
  other: [
    { label: "Usuario", value: "", secret: false },
    { label: "Contraseña", value: "", secret: true },
  ],
};
