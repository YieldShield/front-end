# SQD Snapshot Implementation Plan

This document turns the recommended SQD snapshot architecture into a concrete
build sequence for this repository.

## Done On This Branch

1. Frontend provider seam for points data.
2. Snapshot-capable browser provider and snapshot JSON contract.
3. Shared `@yieldshield/points-core` workspace package.
4. SQD workspace scaffold.
5. Protocol ABI and event normalization wiring.
6. Deterministic ledger materialization for quests, repeatables, and streaks.
7. Snapshot export that matches the browser contract.
8. Local CLI export workflow with a sample action fixture.

## Remaining Work

## Target Decentralized Flow

SQD provides decentralized access to raw chain history, but it does not run the
custom YieldShield points exporter on IPFS. The no-single-point-of-failure goal
comes from making the exporter deterministic and independently runnable:

```text
SQD raw chain data
  -> deterministic open-source points exporter
  -> multiple independent runners
  -> IPFS snapshot CID
  -> signed manifest
  -> decentralized latest-snapshot pointer
  -> IPFS-hosted frontend reads static snapshots
```

## Phase 9: Publishing Flow

Suggested files:

- `packages/points-sqd/scripts/publish-ipfs.mjs`
- CI workflow or external publisher config

Deliverable:

- repeatable snapshot publishing
- stable URL for `VITE_POINTS_SNAPSHOT_BASE_URL`
- content-addressed snapshot CID that can be pinned by multiple operators

## Phase 10: Frontend Cutover

Files to update:

- `.env.example`
- `README.md`
- `apps/web/src/components/ConfigStatusCard.tsx`

Deliverable:

- snapshot provider enabled in deployed environments by default
- legacy GraphQL fallback retained for migration/debugging
- browser validates a snapshot manifest before trusting mutable pointers

## Phase 11: No-SPOF Hardening

Deliverables:

- deterministic manifest with file hashes, block range, rules version, and exporter version
- gateway failover for CID-based snapshots
- optional runner signatures for manifests
- decentralized latest pointer, preferably an on-chain snapshot registry
- multi-runner runbook for independent verification and pinning
