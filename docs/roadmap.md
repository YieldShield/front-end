# Roadmap

See `docs/spec-v1.md` for the full V1 specification.

## Milestone 1: Repository Foundation

Status: complete

- create repo docs
- define architecture boundaries
- establish workspace layout

## Milestone 2: Frontend Scaffold

Status: complete

- set up app shell
- configure static build
- add wallet/provider stack
- wire environment handling

## Milestone 3: Protocol Client

Status: complete for read flows

- add contract configs
- add RPC and chain configuration
- add read/write adapters for factory, pool, token, governance

## Milestone 4: Read-Only Product Flows

Status: complete

- home page
- restore the legacy YieldShield visual shell
- add `Yield` and `Pools` routes
- pool list
- pool detail
- governance overview (read-only; writes deferred to post-V1)
- docs page for supported and removed IPFS-first features
- points, quests, streaks, leaderboard via optional indexed data

## Milestone 5: Transaction Flows

Status: next

- ABI expansion (pool reads/writes, factory writes, ERC20, oracle, Pyth, NFT)
- oracle price module (getPrice, getValue, Pyth Hermes freshness)
- ERC20 approval helper (check-allowance → approve → execute)
- position discovery (Ponder primary, on-chain NFT scanning fallback)
- shielded deposit flow (validation, approval, oracle freshness, drawer UI)
- protector deposit flow
- shielded withdrawal (full + partial + shield activation)
- protector unlock, cancel, and withdraw flows
- claim yield fees (shield positions)
- claim commissions (protector positions)
- pool creation (whitelist token selection, fee config, creation bond)
- user portfolio view (all positions across pools)

## Milestone 6: Deployment and IPFS Hardening

Status: next

- static build verification
- asset path review
- deep-link testing across IPFS gateways
- deployment documentation
- browser-safe points snapshot testing

## Milestone 7: Decentralized Points Indexing

Status: in progress

- deterministic SQD points exporter
- static JSON snapshots for leaderboard, stats, and per-user progress
- manifest with block range, hashes, rules version, and optional runner signatures
- local embedded snapshot smoke mode for IPFS builds
- live Arbitrum Sepolia SQD collection
- IPFS snapshot publication and pinning runbook
- gateway failover and manifest-aware frontend validation
- decentralized latest-snapshot pointer, using DNSLink as the recommended first production path
