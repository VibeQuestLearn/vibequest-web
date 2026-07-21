# VibeQuestLearn Web

Next.js application for focused ecosystem developer labs. The active catalog contains one Zcash shielded-payments track and Google is the only account provider.

Requires Node.js `22.18.0`.

## Run

```bash
nvm use
npm ci
cp .env.example .env.local
npm run dev
```

Start `vibequest-core` on port 8080 or set `CORE_API_BASE_URL`.

## Identity Configuration

| Variable | Required | Purpose |
| --- | --- | --- |
| `CORE_API_BASE_URL` | Production | Server-only Core target. |
| `NEXTAUTH_URL` | Yes | Canonical same-origin callback base. |
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth client ID. |
| `GOOGLE_CLIENT_SECRET` | Yes | Google OAuth client secret. |
| `AUTH_SECRET` | Yes | Encrypts and signs the stateless Web session. |
| `IDENTITY_DERIVATION_SECRET` | Yes | Derives the stable opaque user ID; shared with Core. |
| `CORE_ASSERTION_KEYS` | Yes | Rotating internal assertion keys; shared with Core. |
| `CORE_ASSERTION_ISSUER` | No | Internal assertion issuer, default `vibequest-web`. |
| `CORE_ASSERTION_AUDIENCE` | No | Internal assertion audience, default `vibequest-core`. |

Environment files are ignored. `AUTH_SECRET` must contain at least 32 bytes. All three secrets must be independent. `IDENTITY_DERIVATION_SECRET` and each assertion key are unpadded base64url values decoding to at least 32 bytes. Never expose them through `NEXT_PUBLIC_*` variables.

## Active Boundary

- The root route is server-rendered from Core's validated v3 catalog.
- Track metadata displays the reviewed Zcash source-manifest version supplied by Core.
- Google OAuth creates an encrypted, HTTP-only, same-site session.
- Browser requests reach protected Core routes only through `/api/core`.
- The BFF ignores browser identity and authorization headers, reads the server session, and mints a 60-second assertion for Core.
- CCC, JoyID, wallet proof, wallet local storage, and the client-authoritative legacy workbench have been removed.
- The prior CKB architecture remains only in `docs/legacy-ckb-product-architecture.md` and Git history.

See `docs/authentication.md` for the trust boundary and threat model, and `docs/product-architecture.md` for the platform layout.

## Checks

```bash
npm run lint
npx tsc --noEmit
npm run build
npm run audit:production
```

The `zcashlearn` branch is the only implementation branch for this technical program.
