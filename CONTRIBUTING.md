# Contributing

VibeQuestLearn is being rebuilt as an ecosystem-neutral learning platform with a narrow Zcash implementation track.

## Branch And Scope

- Work on `zcashlearn`; do not commit directly to `main`.
- Keep changes within the approved technical execution plan.
- Keep CKB-era repositories reference-only.

## Local Setup

```bash
nvm use
npm ci
cp .env.example .env.local
npm run dev
```

`.env.local` is local-only. Never stage or commit it.

## Required Checks

```bash
npm run lint
npm run build
npm run audit:production
```

## Engineering Rules

- Keep shared platform types ecosystem-neutral.
- Put Zcash-specific behavior behind explicit Zcash modules and scenario identifiers.
- Treat Google identity as account authentication, never as authorization supplied by the browser.
- Add deterministic tests for security boundaries and denial paths.
- Update documentation when behavior, configuration, or data handling changes.

## Attribution

Alternate primary commit authorship between the authorized FidelCoder and buidlLabs3 identities.
Use a `Co-authored-by` trailer when both profiles contributed to the same technical change.
