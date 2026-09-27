// Pruebas del cifrado: node --experimental-strip-types scripts/test-crypto.ts
import { createVault, unlockVault, rewrapVault, encryptJSON, decryptJSON, generatePassword, WrongMasterPasswordError } from "../src/lib/crypto.ts";
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

console.log("✓ todas las pruebas de cifrado pasaron");
