# Contributing to Bóveda

> **En español:** se aceptan issues y PRs en español o en inglés. Necesitas Node 22+, levantar la base con `supabase start` (o tu propio proyecto de Supabase), y antes de abrir un PR correr `npm run typecheck`, `npm run test:crypto` y `npm run build`. Todo cambio al cifrado requiere una prueba.

Thanks for wanting to help. Issues and pull requests are welcome in English or Spanish.

## Getting set up

You need Node 22+ and either Docker with the [Supabase CLI](https://supabase.com/docs/guides/cli) or your own Supabase project.

```bash
git clone https://github.com/yairhdz24/boveda7k.git
cd boveda7k
npm install
supabase start                 # local Postgres + Auth, migrations applied
cp .env.example .env.local     # paste the API URL and publishable key that `supabase start` printed
```

Create a user in Studio (`http://localhost:54323` → Authentication → Add user), add `BOVEDA_DEMO_EMAIL`, `BOVEDA_DEMO_PASSWORD` and `BOVEDA_DEMO_MASTER` to `.env.local`, then:

```bash
npm run seed:demo              # 4 fictional clients, 19 encrypted credentials
npm run dev                    # http://localhost:3000
```

Never point a development build at a vault with real credentials.

## Before you open a pull request

```bash
npm run typecheck
npm run test:crypto
npm run build
```

CI runs the same three commands.

- Keep pull requests focused on one change and describe how you tested it.
- Include a screenshot or short recording for anything visual, taken with the demo data.
- Commit messages follow `feat:`, `fix:`, `docs:`, `chore:`, in English or Spanish.
- Never commit `.env*` files, project references, keys or real credentials.

## Rules for security-sensitive code

`src/lib/crypto.ts` and `src/lib/passkey.ts` are the security boundary.

- Every change to them needs a test in `scripts/test-crypto.mts` that fails without the change.
- Say in the pull request how the change affects the threat model in [SECURITY.md](SECURITY.md).
- Do not add cryptography dependencies; the project uses the Web Crypto API only.
- Changes to stored formats (`vault_keys`, `vault_passkeys`, `credentials.payload`) must keep existing vaults readable, with a version bump and a migration path.

Found a vulnerability? Do not open a public issue. Follow [SECURITY.md](SECURITY.md).

## Code style

- TypeScript, React 19, Next.js App Router. Match the code around you.
- **Styling**: new UI is written with Tailwind v4 and shadcn/ui-style components (`src/components/ui/`), wired to the design tokens in `src/app/tokens.css` through `src/app/tailwind.css`. Older screens still use the hand-written classes in `src/app/app.css`; migrating them is on the roadmap and a good first contribution. Tailwind's preflight is intentionally off until that migration is done, so `border` needs `border-solid`.
- The interface is in Spanish. Keep copy short and direct.
- Justify any new dependency in the pull request.

## Adding a service to the catalog

Add one line to `SERVICE_PRESETS` in `src/lib/presets.ts`:

```ts
{ name: "Acme Cloud", logo_url: svgl("acme.svg"), category: "Nube", kind: "login", login_url: "https://app.acme.example" },
```

Use the logo from [SVGL](https://svgl.app) when it exists, or `fav("domain.com")` otherwise. `kind` picks the field template (`login`, `email`, `database`, `server`, `api`, `other`).

## Good first contributions

- Services missing from the catalog
- Migrating a screen from `app.css` to Tailwind
- Translating the interface (it needs an i18n layer first; open an issue to discuss the approach)
- Anything on the README roadmap
