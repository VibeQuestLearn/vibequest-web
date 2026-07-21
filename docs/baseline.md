# Technical Baseline

Date: 2026-07-21
Branch: `zcashlearn`
Inherited commit: `041bfab`

## Toolchain

- Node.js `22.18.0`
- npm `10.9.3`
- Next.js `15.5.19`

## Results

| Check | Result |
| --- | --- |
| `npm ci` | Pass |
| `npm run lint` | Pass |
| `npm run build` | Pass |
| `npm run audit:production` at high severity | Pass |

## Observations

- The production build reports a 422 kB first load for the root route.
- The inherited lockfile reports 25 total audit findings, including development-only high findings.
- The production audit reports 23 low or moderate findings, dominated by legacy CKB/JoyID dependencies and bundled Next.js PostCSS.
- The repository instruction references `node_modules/next/dist/docs`, but Next.js 15.5.19 does not ship that directory.
- `node_modules`, build output, and local environment files remain ignored.

This snapshot records inherited behavior before ecosystem, identity, protocol, or interface changes.
