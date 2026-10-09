# Security

Bóveda stores credentials, so security reports get priority over everything else.

## Reporting a vulnerability

**Do not open a public issue.** Use GitHub's private reporting: the repository's **Security** tab → **Report a vulnerability**.

Please include what you found, how to reproduce it, and what an attacker gains. You can expect a first response within 7 days. Once a fix is released you will be credited unless you prefer otherwise.

Only the `main` branch is supported.

## Threat model

### What Bóveda protects against

Everything secret is encrypted in the browser with AES-256-GCM before it is sent. The server stores ciphertext only. This is designed to hold against:

- a leaked or stolen copy of the database or its backups;
- anyone with the Supabase service role or dashboard access, including the hosting operator;
- another authenticated user of the same deployment (row level security on every table, and each user has their own data key);
- a ciphertext being moved onto another credential (the credential id is authenticated as AAD).

### What it does not protect against

- A compromised device, malicious browser extension or XSS **while the vault is unlocked**: the page can read what you can read.
- A weak master password. The database holds the wrapped data key, so an attacker with a copy can try guesses offline, slowed by PBKDF2-SHA256 with 600,000 iterations. Use a long passphrase.
- Whoever serves you the JavaScript. If you do not trust the host, run your own deployment.
- Losing the master password. There is no recovery.

### Metadata that is not encrypted

So that lists and filters work without decrypting everything: the client's name, website and notes; the service name; and each credential's title, environment, login URL and timestamps. Which accounts are linked to each other *is* encrypted.

## Key hierarchy

```
master password ──PBKDF2-SHA256, 600,000 iterations, 16-byte salt──▶ KEK
random DEK (AES-256-GCM) ──wrapped with the KEK──▶ vault_keys
each credential ──AES-256-GCM with the DEK, AAD = credential id──▶ credentials.payload
```

The DEK is held in memory as a non-extractable `CryptoKey` while the vault is unlocked, and dropped on lock, on reload and after 15 minutes idle.

## Biometric unlock

Biometric unlock adds a second wrapping of the same DEK. It does not store the master password or the DEK anywhere in the clear.

- Each device registers a platform passkey with the WebAuthn **PRF** extension. With user verification, the authenticator returns a 32-byte secret that is deterministic for that passkey and a random per-passkey salt.
- That secret goes through HKDF-SHA256 (`info = "boveda:passkey-kek:v1"`) to produce an AES-256-GCM key that wraps the DEK. The AAD is `"boveda:dek:passkey:v1:" + credential id`, so a wrapped key cannot be replayed under another passkey.
- The wrapped DEK is stored in `vault_passkeys`. Without the authenticator and its user verification, the row is useless.
- **The WebAuthn challenge is generated in the client and the assertion is not verified by a server.** That is deliberate: the passkey is not used to authenticate to anything. The security boundary is the PRF secret, which only the authenticator can produce. Supabase Auth still gates access to the rows.
- Registering a device requires the master password, because wrapping needs an extractable copy of the DEK. That copy exists only for the duration of the enrollment.
- Revoking a device deletes its row, so the passkey left on the device has nothing to unwrap. Revoking does **not** rotate the DEK: someone who had already copied that row *and* controls the device could still unwrap their copy. If a device was stolen while its vault could be opened, rotate the credentials it had access to.
- Browsers without a user-verifying platform authenticator are not offered the option. Some browsers cannot tell in advance whether PRF is available; there the option is offered once, enrollment fails with a clear message, and it is not offered again.

A consequence worth knowing: someone who can pass your device's biometric check, or knows the device passcode where the platform accepts it as a fallback, can unlock the vault on that device while your Supabase session is active. Sign out on shared machines.

## Hardening a deployment

- Serve over HTTPS only.
- Turn off public sign-ups in Supabase Auth.
- Put self-hosted deployments behind an access proxy or IP allowlist.
- Rotate credentials flagged as older than 90 days.
