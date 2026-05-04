# @yieldshield-lite/points-sqd

SQD-based points indexer and snapshot exporter scaffold for YieldShield Lite.
The browser now computes connected-wallet points by default; this package
produces fallback/global snapshots for rank, leaderboard, totals, and recovery
when browser RPC scanning fails.

This package is responsible for:

- indexing YieldShield protocol events from Arbitrum Sepolia
- applying shared rules from `@yieldshield-lite/points-core`
- exporting static snapshot JSON consumed by the frontend

## Planned Runtime Outputs

The exporter should write the contract documented in
[`../../docs/points-snapshot-contract.md`](../../docs/points-snapshot-contract.md):

```text
manifest.json
leaderboard.json
stats.json
users/<lowercase-address>.json
```

## Scope For V1

Phase 1 should only materialize deterministic point awards that are clearly
represented in the current YieldShield event flow:

- `creator_pool_architect`
- `creator_fee_collector`
- `saver_first_shield`
- `saver_first_reward_claim`
- `saver_first_partial_withdrawal`
- `saver_first_full_withdrawal`
- `saver_activate_shield`
- `protector_first_protection`
- `protector_first_commission`
- `protector_unlock_initiation`
- `protector_unlock_cancellation`

Deferred until rules are formalized:

- `saver_multi_pool`
- `protector_multi_pool`
- `creator_pool_traction`
- journey bonuses with strict parity guarantees
- finalized streak bonus multipliers beyond the published tier table

## Implementation Phases

1. Configure the SQD processor for the factory, pool template contracts, and governor.
2. Materialize raw action events into a normalized per-user ledger.
3. Apply points rules from `@yieldshield-lite/points-core` to build user totals, quest completions, and streak rows.
4. Export static snapshots and a deterministic manifest that match the browser contract.
5. Publish snapshots to IPFS and resolve the latest CID through DNSLink gateway failover, with an on-chain registry left as an optional future governance path.

Phase 1 is now wired in this repo with:

- minimal upstream ABI files for factory, pool, and governor events
- chain defaults for Arbitrum Sepolia and local Foundry
- event normalizers that turn upstream logs into `IndexedAction[]`

## Local Export Flow

You can generate snapshots from a normalized actions file with:

```bash
npm run export:local --workspace @yieldshield-lite/points-sqd -- \
  --input packages/points-sqd/examples/actions.sample.json \
  --output /tmp/yieldshield-lite-points \
  --chain-id 421614 \
  --from-block 235206800 \
  --finalized-block 235206900 \
  --finalized-block-timestamp 2026-04-09T10:05:00.000Z \
  --generated-at 2026-04-09T10:05:00.000Z
```

When block metadata flags are omitted for a non-empty fixture, the local exporter
derives deterministic values from the action set. It never falls back to the
wall clock.

## Live SQD Export

The live exporter reads finalized chain data through SQD gateway and/or RPC, then
writes the same deterministic snapshot contract:

```bash
npm run export:sqd --workspace @yieldshield-lite/points-sqd -- \
  --output ./dist/snapshots \
  --gateway-url https://v2.archive.subsquid.io/network/arbitrum-sepolia \
  --rpc-url <public-or-private-rpc-url> \
  --from-block 235206778 \
  --finalized-block <finalized-block-number> \
  --finalized-block-timestamp <finalized-block-timestamp-iso>
```

`--finalized-block` and `--finalized-block-timestamp` are required on purpose:
they make the exported metadata reproducible and keep the job reorg-safe. If you
start after historical `PoolCreated` events, provide known pools with
`--pool-address-allowlist 0xpool1,0xpool2` so pool logs can be filtered without
trusting unrelated contracts that emit matching event signatures.

## IPFS Publishing

Publish any completed snapshot directory with a local Kubo-compatible `ipfs`
binary:

```bash
npm run publish:ipfs --workspace @yieldshield-lite/points-sqd -- \
  --dir ./dist/snapshots
```

The script prints the root snapshot CID. Do not write that CID back into
`manifest.json` before publishing the same directory: changing the manifest
would change the CID. Store the CID in the frontend env for fixed builds, or in
the recommended DNSLink alias for no-redeploy snapshot refreshes. An on-chain
latest-snapshot registry remains an optional future path when the pointer itself
needs an on-chain governance trail.

For the DNSLink path, configure the frontend with
`VITE_POINTS_SNAPSHOT_DNSLINK_NAME=points.yieldshield.example`, then update the
DNS TXT record after each publish:

```text
_dnslink.points.yieldshield.example TXT dnslink=/ipfs/<snapshot-cid>
```

The publisher intentionally stages a clean IPFS directory from `manifest.json`
before running `ipfs add`. It copies only `manifest.json` and the files listed
in the manifest, and it verifies each listed file's byte length and SHA-256
hash before publishing. This keeps CIDs deterministic when a reused output
directory contains stale top-level files or old `users/*.json` snapshots that
are no longer part of the manifest.

Avoid running `ipfs add -r` directly on a reused snapshot output directory. If
you bypass `publish:ipfs`, first write into a fresh staging directory, clear the
output directory, or publish only the manifest-listed files; otherwise two
runners with identical snapshot inputs can produce different IPFS directory
CIDs.
