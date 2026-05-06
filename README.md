# YieldShield Front End

[![CI](https://github.com/YieldShield/front-end/actions/workflows/ci.yml/badge.svg)](https://github.com/YieldShield/front-end/actions/workflows/ci.yml)
[![License](https://img.shields.io/github/license/YieldShield/front-end)](LICENSE)

YieldShield front end is an IPFS-first browser app for the YieldShield protocol that
keeps the visual identity, landing page structure, and product shell of the
existing YieldShield site while removing the hosted-runtime assumptions that do
not fit static deployment.

This repository exists to rebuild the front end around browser-only execution
for the contracts in `packages/foundry` from the main YieldShield monorepo,
without bringing over the server-heavy parts of the current Next.js
application.

## Why a New Frontend

The existing frontend already contains early IPFS export work, but it still
depends on request-time Next.js behavior, internal API routes, server-side
Ponder wrappers, Dynamic wallet auth, and other features that do not map
cleanly to static IPFS hosting.

YieldShield front end starts from the opposite direction:

- static-first build output
- reuse the existing YieldShield design wherever IPFS does not constrain it
- browser-only wallet and contract interactions
- hosted indexer access treated as an external dependency
- minimal off-chain requirements
- small, modular feature slices instead of monolithic pages

## Current Product Shape

The current app mirrors the familiar YieldShield route structure:

- `/` for the landing page
- `/dapp` for the yield-focused entry point
- `/dashboard` for pool browsing
- `/governance` for governance status
- `/docs` for IPFS-first scope and migration notes

Under the hood, the implementation is different from the old site:

- `HashRouter` for IPFS-safe deep links
- RainbowKit instead of Dynamic.xyz
- direct browser reads from the deployed contracts
- no internal API routes or server-side wrappers

## V1 Scope

The first version of this repo is focused on core protocol usage:

- wallet connection
- pool discovery
- pool detail views
- shielded and protector deposit flows
- withdrawal and claim flows
- pool creation
- lightweight governance support
- static documentation and product pages that match the existing brand

The following are intentionally out of scope for the first milestone:

- alert emails
- waitlist flows
- cron jobs
- backend mutation endpoints
- Dynamic.xyz integration
- server-side metadata signing routes
- off-chain profile editing

## Principles

1. IPFS compatibility comes first.
2. On-chain reads are the source of truth for transaction-critical flows.
3. Indexed data is optional enrichment, not a hard runtime assumption.
4. Features that require secrets or trusted backend behavior stay outside this app.
5. Reuse protocol knowledge from the original repo, but do not copy over runtime coupling.

## Deployment Targets

Currently configured Arbitrum Sepolia deployment set (staging release s1.0.2):

- `SplitRiskPoolFactory`: `0x755C9bd97B882278E3d19D2A1e31ad522C3f6483`
- `YSGovernor`: `0x6E6d60fAc4FE03279652fe28ea7d837E51e091Ca`
- `YSToken`: `0x59901b01FAa6d4928FBB24838D009B47d47631a8`
- `TimelockController`: `0xEC57FcFBAe031B4d983a24A5688949FAE5Ee848C`
- `SplitRiskPool` implementation: `0xa9a98eaEFc534c8f53C7FbEc6B38fE77E83AbbA3`

## Repository Layout

```text
apps/
  web/                    IPFS-first Vite/React frontend application
docs/                     Architecture, deployment, and points snapshot notes
packages/
  points-core/            Shared points rules and snapshot types
  points-sqd/             Optional SQD/RPC snapshot exporter
.github/                  CI, Dependabot, issue forms, and PR template
```

## Development Status

This repository is active and still pre-production. The current state includes:

1. Vite-based static frontend scaffold
2. contract-aware protocol client layer
3. legacy YieldShield shell and landing-page restoration
4. wallet connection and protocol read flows
5. deposit, withdrawal, claim, and pool-creation UI paths
6. static docs and decentralized points snapshot support

Next up:

1. transaction-flow hardening
2. IPFS deployment hardening
3. release polish and production configuration review
4. broader cross-browser and wallet QA

## Community

- License: MIT, see [`LICENSE`](LICENSE).
- Changelog: see [`CHANGELOG.md`](CHANGELOG.md).
- Contributing: see [`CONTRIBUTING.md`](CONTRIBUTING.md).
- Security reports: see [`SECURITY.md`](SECURITY.md).
- Support: see [`SUPPORT.md`](SUPPORT.md).
- Maintainers and release expectations: see [`MAINTAINERS.md`](MAINTAINERS.md).
- Release process: see [`RELEASE.md`](RELEASE.md).

## Security and Risk

This repository is a frontend for an experimental, pre-production protocol
deployment. The current configuration targets Arbitrum Sepolia and should not be
treated as a mainnet production release or as a place for production funds.

- Frontend environment variables are public after build time.
- Public RPCs, gateways, and hosted indexers are treated as untrusted inputs.
- Contract reads and writes are the source of truth for transaction-critical
  flows.
- Points data is advisory off-chain scoring unless a separate official program
  says otherwise.
- This repository is not financial, legal, tax, or investment advice.

For more detail, see
[`docs/security/frontend-threat-model.md`](docs/security/frontend-threat-model.md).

## Local Development

```bash
npm ci
npm run dev
```

The frontend app lives in `apps/web`.

## Common Commands

Run the local development server:

```bash
npm run dev
```

Typecheck every workspace covered by CI:

```bash
npm run typecheck
```

Run the test suites:

```bash
npm test
```

Build the static frontend:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

Check high-severity production dependency advisories:

```bash
npm audit --omit=dev --audit-level=high
```

Check formatting for docs and configuration:

```bash
npm run format:check
```

Copy `.env.example` to `.env` and fill in at least the WalletConnect project ID
when you want full wallet connector support. The browser app defaults Arbitrum
Sepolia reads to a Chainlist-listed public RPC fallback list that works for
browser log scans. You can override or extend that list with public endpoints if
one of the shared fallbacks is rate-limited. Keep private API-key RPCs out of
IPFS builds, because frontend environment variables are baked into static
assets.

Useful optional variables:

- `VITE_RPC_URL_421614` to set the primary Arbitrum Sepolia RPC
- `VITE_RPC_URLS_421614` for comma-separated Arbitrum Sepolia fallback RPCs
- `VITE_RPC_URL_31337` for local Foundry testing
- `VITE_POINTS_PROVIDER` to force either `snapshot` or `graphql`
- `VITE_POINTS_SNAPSHOT_BASE_URL` for static points snapshot JSON
- `VITE_POINTS_SNAPSHOT_CID` plus `VITE_POINTS_SNAPSHOT_GATEWAYS` for IPFS CID failover
- `VITE_POINTS_SNAPSHOT_DNSLINK_NAME` for the recommended DNSLink-backed mutable snapshot pointer
- `VITE_POINTS_SNAPSHOT_MANIFEST_URL` for a direct manifest entrypoint
- `VITE_POINTS_SNAPSHOT_REGISTRY_ADDRESS` for an optional future on-chain latest CID pointer
- `VITE_POINTS_GRAPHQL_URL` for a generic points GraphQL endpoint
- `VITE_PONDER_GRAPHQL_URL` and `VITE_PONDER_API_URL` remain as legacy compatibility vars

For full IPFS deployment instructions, including frontend publishing, snapshot
publishing, and the no-redeploy latest-snapshot pointer path, see
[`docs/ipfs-deployment.md`](docs/ipfs-deployment.md).

For a quick local IPFS smoke build with embedded sample snapshots:

```text
VITE_POINTS_PROVIDER=browser
VITE_POINTS_SNAPSHOT_BASE_URL=./points-snapshots
```

Generate a local embedded sample before building:

```bash
npm run points:export:sample:web -- --rewrite-user-address <your-wallet>
npm run build
```

The intended decentralized points flow is not a browser-to-SQD API call. SQD is
used by an independently runnable exporter to read chain history and produce
static snapshot files. Those files can be pinned to IPFS and loaded by the
browser without secrets.

## Verification

The current open-source readiness pass was checked with:

```bash
npm ci
npm run typecheck
npm test
npm run build
npm audit --omit=dev --audit-level=high
```

The Vite production build currently completes with bundle-size warnings for a
few wallet and dependency chunks. Those warnings are tracked as optimization
work, not release blockers for the open-source baseline.

## Contributing and Support

See [CONTRIBUTING.md](CONTRIBUTING.md) for development and pull request
guidelines. Use [SUPPORT.md](SUPPORT.md) for support boundaries and
[SECURITY.md](SECURITY.md) for vulnerability reporting.

## Related Repositories

- Main protocol/frontend monorepo:
  <https://github.com/YieldShield/yieldshield>
- Current frontend package:
  <https://github.com/YieldShield/yieldshield/tree/main/packages/nextjs>
- Contracts package:
  <https://github.com/YieldShield/yieldshield/tree/main/packages/foundry>
- Standalone smart contracts repository:
  <https://github.com/YieldShield/smart-contracts>
- IPFS research note:
  <https://github.com/YieldShield/yieldshield/blob/ipfs-hosting/docs/IPFS_HOSTING_RESEARCH_2026-03-27.md>

## Provenance

This repository was initialized from
`YieldShield/yieldshield-lite@87433b63b91531792291d4d9231e7bad90f862a2` as a
single root commit without importing prior Git history.

See [`NOTICE`](NOTICE) for repository provenance and licensing notes.
