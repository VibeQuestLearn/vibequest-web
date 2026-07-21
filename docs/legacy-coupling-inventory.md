# Legacy Coupling Inventory

Snapshot: 2026-07-21, inherited commit `041bfab`.

## Runtime Surfaces

| Area | Current coupling | Removal target |
| --- | --- | --- |
| `src/components/ckb-wallet-provider.tsx` | CCC testnet and JoyID provider | Chunk 02 |
| `src/components/vibequest-workbench.tsx` | Wallet identity, CKB/Fiber tracks, rewards, client gates | Chunks 01-07 |
| `src/lib/api.ts` | Wallet-address APIs, CKB readiness, Fiber claims | Chunks 01-03 |
| `src/components/WorkbenchView.tsx` | Lexical checks and CKB/Fiber trust copy | Chunks 04-06 |
| `src/components/ShipGateView.tsx` | Fiber invoices and reward claims | Chunk 01 |
| Landing, dashboard, navigation, and learning views | Wallet actions and CKB/Fiber positioning | Chunks 01-04 |
| README and product architecture | CKB/JoyID/Fiber source of truth | Chunks 01-03 |

## Removal Sequence

- Chunk 01 introduces ecosystem-neutral identifiers and removes reward and payout surfaces.
- Chunk 02 replaces wallet authentication with Google account sessions.
- Chunk 03 adds reviewed Zcash protocol types and adapters.
- Chunks 04-06 replace generated lexical checks with versioned executable scenarios.
- Chunk 07 makes server-owned learner records the dashboard source of truth.

## Invariants

- Legacy CKB types are removed, not renamed into misleading Zcash types.
- Wallet addresses never become the new account identifier.
- Reward, badge, invoice, and payout state do not enter the new data model.
