// Pruebas del cifrado: node --experimental-strip-types scripts/test-crypto.ts
import { createVault, unlockVault, rewrapVault, encryptJSON, decryptJSON, generatePassword, WrongMasterPasswordError, wrapDekWithSecret, unwrapDekWithSecret, PasskeyUnlockError } from "../src/lib/crypto.ts";
import assert from "node:assert/strict";

const t0 = Date.now();
const { record, dek } = await createVault("una frase larga de prueba 2026!");
console.log(`createVault: ${Date.now() - t0} ms`);

const secret = { fields: [{ label: "Contraseña", value: "Kq7!v2mZp9xR", secret: true }], notes: "nota" };
const id = crypto.randomUUID();
const payload = await encryptJSON(dek, secret, id);
assert.ok(!JSON.stringify(payload).includes("Kq7"), "el texto plano no debe aparecer");
assert.deepEqual(await decryptJSON(dek, payload, id), secret);

// AAD: un payload movido a otra credencial no se descifra
await assert.rejects(decryptJSON(dek, payload, crypto.randomUUID()));

// Contraseña incorrecta
await assert.rejects(unlockVault("otra", record), WrongMasterPasswordError);

// Desbloqueo correcto y DEK no extraíble
const dek2 = await unlockVault("una frase larga de prueba 2026!", record);
assert.equal(dek2.extractable, false);
assert.deepEqual(await decryptJSON(dek2, payload, id), secret);

// Cambio de contraseña maestra sin recifrar
const rec2 = await rewrapVault("una frase larga de prueba 2026!", "nueva frase maestra 999", record);
const dek3 = await unlockVault("nueva frase maestra 999", rec2);
assert.deepEqual(await decryptJSON(dek3, payload, id), secret);
await assert.rejects(unlockVault("una frase larga de prueba 2026!", rec2), WrongMasterPasswordError);

// Generador
const pw = generatePassword(24);
assert.equal(pw.length, 24);
assert.ok(/[A-Z]/.test(pw) && /[a-z]/.test(pw) && /[0-9]/.test(pw) && /[^A-Za-z0-9]/.test(pw));

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
await assert.rejects(unwrapDekWithSecret(prf, { ...wrap, wrapped_key: "AAAA" + wrap.wrapped_key.slice(4) }, "cred-A"), PasskeyUnlockError);

// Dos envolturas de la misma DEK no comparten IV
const wrap2 = await wrapDekWithSecret(dekX, prf, "cred-A");
assert.notEqual(wrap.wrap_iv, wrap2.wrap_iv);

console.log("✓ todas las pruebas de cifrado pasaron");
