# VibeQuestLearn Web

Next.js application for VibeQuestLearn, the multi-ecosystem AI learning workbench. The product is ecosystem-neutral by design: Google owns account authentication, Core owns learner state, and ecosystem-specific content is delivered through reviewed tracks and adapters.

Requires Node.js `22.18.0`.

## Run

```bash
nvm use
npm ci
cp .env.example .env
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

`.env` is ignored by git. `AUTH_SECRET` must contain at least 32 bytes. All three secrets must be independent. `IDENTITY_DERIVATION_SECRET` and each assertion key are unpadded base64url values decoding to at least 32 bytes. Never expose them through `NEXT_PUBLIC_*` variables.

## Active Boundary

- The root route renders the VibeQuest multi-ecosystem workbench.
- Google OAuth creates an encrypted, HTTP-only, same-site learning session.
- Browser requests reach protected Core routes only through `/api/core`.
- The BFF ignores browser identity and authorization headers, reads the server session, and mints a 60-second assertion for Core.
- Ecosystems and tracks are rendered from Core catalog data; they are not hardcoded as platform identity.
- Generated lessons, checkpoints, tutor exchanges, code mode, and module state are saved under the opaque Google-derived user ID when persistence is available.
- Lesson quests open in Workbench only after Core returns reviewed track artifacts.
- Runner controls appear only when Core reports a reviewed runner API enabled for the active track.
- External signing connectors, proof ownership, invoice claims, and client-authoritative completion are not part of the v3 product boundary.

## Product Shape

VibeQuest uses one shared learning model across ecosystems:

1. learner signs in with Google;
2. learner chooses an ecosystem and track;
3. learner configures topic, profile, pace, and code preference;
4. Core returns reviewed or generated learning content shaped by the selected track;
5. learner studies modules and submodules;
6. learner passes checkpoints;
7. Workbench opens code/scenario artifacts when the track supports them;
8. Core records completion from server-owned evidence.

The current grant-facing track is Zcash shielded payments. CKB, Fiber, Zcash, and future ecosystems should all use the same account, dashboard, lesson, checkpoint, tutor, and completion patterns.

## Validation Artifact UX

Generated courses expose Core's evaluation artifact directly inside the lesson and saved-course views. Web renders validation gates, source categories, integration tags, code-mode state, denial-test count, compute failure-case count, execution path, compute-model coverage, final-lab readiness, unsupported-claim warnings, and provider metadata without letting the browser decide whether a lesson is trustworthy. Older saved sessions still render with local quality signals when the new artifact fields are absent.

## TON / STON.fi Demo Path

1. Open VibeQuest and sign in.
2. Go to Learn and select TON / STON.fi.
3. Pick a focused swap, jetton, slippage, or TON Connect topic.
4. Enable code mode when code examples are needed.
5. Generate the course; module 1 opens while Core continues validating modules 2-5.
6. Inspect the validation artifact, copy or ask about code samples, pass checkpoints, and continue to the final safe-swap lab.

Grant-readiness metrics are captured through course generation, module opened, checkpoint attempted/passed, tutor used, code sample copied, generation failed/retried, and course completed events with ecosystem IDs.

## Golem Demo Path

1. Open VibeQuest and sign in.
2. Go to Learn and select Golem.
3. Use the visible grant-proof sample setup or pick a focused requestor/provider, Yagna, JS SDK, Python/Ray, dApp, or failure-state topic.
4. Enable code mode when code examples are needed; the sample setup enables it automatically.
5. Generate the course; module 1 opens while Core continues validating modules 2-5.
6. Inspect compute-model coverage, execution path, failure-case count, official-source categories, code samples, checkpoints, and final compute quest readiness.

Grant-readiness evidence for Golem should show a generated source-grounded course, validation artifact, code-copy event, checkpoint attempt, final quest visibility, and usage metrics.

The Golem session modal exposes the reviewer sample path after a learner selects Golem: one narrow topic, audit-heavy profile, code mode, progressive module generation, validation-gate inspection, checkpoint proof, and final compute quest visibility.

## AIBTC Agent Lab Demo Path

1. Open VibeQuest and sign in.
2. Go to Learn and select AIBTC / Stacks Agents.
3. Use the agent lab sample setup or pick a focused signed-action, bounty, sBTC payment-proof, x402, or reputation topic.
4. Enable code mode when code examples are needed; the sample setup enables it automatically.
5. Generate the course; module 1 opens while Core continues validating modules 2-5.
6. Inspect agent identity coverage, signed-action coverage, bounty-workflow coverage, sBTC payment-proof coverage, unsafe-autonomy warnings, source categories, code samples, checkpoints, and final agent quest readiness.

Grant-readiness evidence for AIBTC should show a generated source-grounded course, validation artifact, code-copy event, checkpoint attempt, final quest visibility, and usage metrics.

## Product Architecture

The product architecture is documented in [`docs/product-architecture.md`](docs/product-architecture.md). It explains the ecosystem-neutral platform contract, identity boundary, catalog model, runner boundary, and documentation rules.

## Paired Backend

Use `vibequest-core` for Google-backed account verification, catalog delivery, course generation, tutor support, progress persistence, reviewed track projections, and optional runner evidence.

## Checks

```bash
npm run lint
npx tsc --noEmit
npm run build
npm run audit:production
```

The `zcashlearn` branch is the active implementation branch for this technical program.
