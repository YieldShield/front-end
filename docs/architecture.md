# Architecture

## Goal

Build a static, browser-executed frontend for YieldShield that can be published
to IPFS without depending on a Next.js server runtime, while preserving the
existing YieldShield design and product feel wherever static hosting does not
impose a constraint.

## Hosting Model

The app should be deployable as a static artifact and served from:

- IPFS via DNSLink, or
- an IPFS CID subdomain gateway

The app should not rely on:

- request-time server rendering
- internal API routes
- mutable runtime secrets
- host-specific rewrite logic

## Decentralized Points Model

YieldShield front end defaults to computing personal points in the browser for the
connected wallet only. It does not require a live points backend to show a
user's own points, quests, or streak.

The intended default flow is:

```text
IPFS-hosted frontend
  -> browser public RPC
  -> connected-wallet log scan
  -> shared points-core rules
  -> personal points view
```

Global rank, leaderboard, and total distributed points still need a full
population view. Those are provided by optional static JSON snapshots that can
be published to IPFS and fetched like any other static asset:

```text
SQD raw chain data
  -> deterministic open-source points exporter
  -> multiple independent runners
  -> IPFS snapshot CID
  -> decentralized latest-snapshot pointer
  -> IPFS-hosted frontend reads static snapshots
```

The custom YieldShield points exporter still runs as normal compute outside
IPFS, for example in CI, on a VPS, or by independent community operators.
No-single-point-of-failure comes from browser-side personal computation,
deterministic snapshots for global views, multiple runners, IPFS
publication/pinning, and a decentralized latest-snapshot discovery layer.

The browser should never need a privileged SQD, Ponder, or Graph gateway key.
For local and embedded IPFS tests, `VITE_POINTS_PROVIDER=browser` can be paired
with `VITE_POINTS_SNAPSHOT_BASE_URL=./points-snapshots` so personal points come
from the browser and global views come from bundled snapshots. For production,
the recommended no-redeploy path is DNSLink plus signed manifests and multiple
operators pinning the same CID. An on-chain latest-snapshot registry remains an
optional future path when the pointer needs an on-chain manifest hash and
governance trail.

## UX Continuity

The migration is not meant to invent a new brand or product shell.

Wherever possible, the browser app should reuse or faithfully port:

- the public header and footer
- the landing-page composition
- the old route structure
- the existing YieldShield color system and theme tokens

What changes is the runtime model, not the product identity.

## Data Sources

### Required

- EVM RPC endpoints for direct contract reads and writes
- contract ABIs and deployment addresses
- static assets copied into the built artifact

### Optional

- static points snapshots exported from SQD-indexed chain history
- hosted GraphQL endpoints for temporary debugging or legacy indexed views
- public token/icon/price sources where they do not block core flows

## Source of Truth

For any action that can move funds or affect protocol state:

- contract state wins over cached or indexed data
- off-chain data is treated as advisory only
- point snapshots are reproducible artifacts, not authority for fund-moving
  protocol state

## Feature Boundaries

### In Scope

- wallet connection
- pool discovery and inspection
- position inspection
- create pool
- deposit, withdraw, claim, unlock
- governance read flows

### Out of Scope for V1

- email alerts
- waitlist
- backend-authenticated profile updates
- cron-driven maintenance
- server-side price proxying unless there is no viable browser path
- hosted points, quests, and leaderboard logic

## Migration Philosophy

We will reuse the protocol knowledge and selected UI ideas from the main
YieldShield repo, but not the architectural assumptions that make the current
frontend hard to export statically.

## Current Deployment Source

Arbitrum Sepolia addresses in this repo should track the latest foundry
deployment artifacts from the main monorepo, with the factory proxy treated as
the user-facing entry point rather than the underlying implementation contract.
