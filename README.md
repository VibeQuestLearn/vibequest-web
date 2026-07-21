# VibeQuestLearn Web

Next.js application shell for ecosystem-specific developer learning labs. The active catalog currently exposes only the Zcash shielded-payments track.

Requires Node.js `22.18.0`.

## Run

```bash
nvm use
npm ci
cp .env.example .env.local
npm run dev
```

Start `vibequest-core` on port 8080 or set `CORE_API_BASE_URL`.

## Environment

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `CORE_API_BASE_URL` | Production | local Core in development | Server-only Core target. |
| `NEXT_PUBLIC_API_BASE_URL` | No | `/api/core` | Browser proxy base for future authenticated calls. |

Environment files are ignored. Never place Google secrets, tokens, seed phrases, spending keys, or learner data in browser-visible variables.

## Active Product

- Server-rendered work-focused shell rather than a marketing landing page.
- Runtime-validated v3 catalog loaded from Core.
- Zcash is the only ecosystem entry.
- `shielded-payments-safety` is visible but disabled until its verifier and scenarios are ready.
- No wallet, reward, badge, CKB, Fiber, or JoyID claim appears in the active shell.

## Compatibility Boundary

The inherited application remains temporarily buildable for reference:

- legacy API DTOs: `src/lib/legacy-api.ts`
- legacy orchestrator: `src/components/vibequest-workbench.tsx`
- legacy architecture: `docs/legacy-ckb-product-architecture.md`

These modules are not imported by the root route. Wallet identity is removed in Chunk 02 and the old workbench path is removed in Chunk 06.

## Architecture

See [`docs/product-architecture.md`](docs/product-architecture.md).

## Checks

```bash
npm run lint
npm run build
npm run audit:production
```

The `zcashlearn` branch is the only implementation branch for this technical program.
