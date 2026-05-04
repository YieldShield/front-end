# IPFS Deployment Runbook

This runbook covers the static frontend and the optional points snapshots. IPFS
serves the built app and snapshot JSON files. It does not run the SQD exporter,
cron jobs, API routes, or private-key automation.

## What Gets Published

- `apps/web/dist`: the Vite static frontend.
- A points snapshot directory, if you want global rank, leaderboard, total
  distributed points, or fallback data when browser wallet scanning fails.
- A latest-snapshot pointer, if you want to refresh snapshots without rebuilding
  the frontend.

Personal wallet points can run without snapshots. The browser scans finalized
logs for the connected wallet and applies `@yieldshield-lite/points-core` rules
locally. Snapshot data is for global views and fallback.

## Prerequisites

- Node.js 20 or newer.
- `npm install` completed from the repo root.
- A Kubo-compatible `ipfs` CLI for local publishing.
- A browser-safe RPC URL for Arbitrum Sepolia if the public fallback is
  rate-limited.
- Optional: an SQD gateway URL for faster historical snapshot export.
- Optional: a DNSLink name if you do not want frontend redeploys for every new
  snapshot. A latest-snapshot registry contract is only needed for the optional
  future on-chain pointer path.

Do not put private keys or privileged API keys in `VITE_*` variables. They are
compiled into the static frontend bundle.

## Choose A Points Mode

### Browser-only personal points

Use this when you only need connected-wallet points, quests, and streaks:

```text
VITE_POINTS_PROVIDER=browser
VITE_POINTS_SNAPSHOT_BASE_URL=
VITE_POINTS_SNAPSHOT_CID=
VITE_POINTS_SNAPSHOT_MANIFEST_URL=
VITE_POINTS_SNAPSHOT_REGISTRY_ADDRESS=
```

No snapshot publish is required. The leaderboard and global totals are hidden.

### Embedded snapshot smoke test

Use this for a local or demo IPFS build where the snapshot files live inside the
frontend artifact:

```text
VITE_POINTS_PROVIDER=browser
VITE_POINTS_SNAPSHOT_BASE_URL=./points-snapshots
```

Generate sample snapshot files before building:

```bash
npm run points:export:sample:web -- --rewrite-user-address <your-wallet>
```

Because the snapshot files are inside `apps/web/public`, refreshing this
snapshot requires rebuilding and republishing the frontend.

### Fixed IPFS snapshot CID

Use this when you want the frontend to fetch snapshot files from a separate IPFS
snapshot directory:

```text
VITE_POINTS_PROVIDER=browser
VITE_POINTS_SNAPSHOT_CID=bafy...
VITE_POINTS_SNAPSHOT_GATEWAYS=https://ipfs.io/ipfs/{cid},https://dweb.link/ipfs/{cid}
VITE_POINTS_SNAPSHOT_EXPECTED_CHAIN_ID=421614
```

This is content-addressed and simple, but every updated snapshot has a new CID.
If the CID is hardcoded in the frontend environment, refreshing it requires a
frontend rebuild and republish.

### DNSLink snapshot pointer

Use this as the recommended first production-style mutable pointer:

```text
VITE_POINTS_PROVIDER=browser
VITE_POINTS_SNAPSHOT_DNSLINK_NAME=points.yieldshield.example
VITE_POINTS_SNAPSHOT_DNSLINK_GATEWAYS=https://dweb.link/ipns/{name},https://ipfs.io/ipns/{name}
VITE_POINTS_SNAPSHOT_EXPECTED_CHAIN_ID=421614
VITE_POINTS_SNAPSHOT_ALLOWED_SIGNERS=0xrunner1,0xrunner2
VITE_POINTS_SNAPSHOT_SIGNATURE_THRESHOLD=1
```

Create or update this DNS TXT record whenever a new snapshot is published:

```text
_dnslink.points.yieldshield.example TXT dnslink=/ipfs/<snapshot-cid>
```

The frontend resolves the DNSLink name through IPFS gateways under the IPNS
namespace, fetches `manifest.json`, and validates the manifest and file hashes.
When using DNSLink as the mutable pointer, runner signatures are recommended so
the browser rejects manifests that were not signed by expected operators.

With this mode, a normal snapshot refresh is:

1. Export a new finalized snapshot.
2. Publish and pin it to IPFS.
3. Update the DNSLink TXT record to the new CID.

No frontend redeploy is needed. DNS caching and gateway caches can delay
propagation, so keep the previous snapshot pinned during the transition.

### Optional latest-snapshot registry

Use this only if points need stronger on-chain pointer auditability:

```text
VITE_POINTS_PROVIDER=browser
VITE_POINTS_SNAPSHOT_REGISTRY_ADDRESS=0x...
VITE_POINTS_SNAPSHOT_REGISTRY_CHAIN_ID=421614
VITE_POINTS_SNAPSHOT_GATEWAYS=https://ipfs.io/ipfs/{cid},https://dweb.link/ipfs/{cid}
VITE_POINTS_SNAPSHOT_EXPECTED_CHAIN_ID=421614
```

The frontend reads `latestSnapshot()` or `latest()` from the registry, receives a
root IPFS CID and manifest hash, fetches `manifest.json` through the configured
gateways, and validates the manifest and file hashes before using the data.

With this mode, a normal snapshot refresh is:

1. Export a new finalized snapshot.
2. Publish and pin it to IPFS.
3. Update the registry pointer to the new CID and manifest hash.

No frontend redeploy is needed. Users with an already-open tab may need to
refresh the page because the snapshot context is resolved once per page load.

The registry contract itself is not implemented in this repo; the frontend only
requires this read shape:

```solidity
function latestSnapshot()
  external
  view
  returns (
    string memory cid,
    uint256 finalizedBlockNumber,
    bytes32 manifestHash,
    uint256 schemaVersion
  );
```

`latest()` with the same return shape is also supported.

## Export A Live Points Snapshot

Run this from the repo root, using an explicit snapshot directory so the later
publish step points at the same files:

```bash
SNAPSHOT_DIR="$PWD/.tmp/points-snapshots"

npm run export:sqd --workspace @yieldshield-lite/points-sqd -- \
  --output "$SNAPSHOT_DIR" \
  --gateway-url https://v2.archive.subsquid.io/network/arbitrum-sepolia \
  --rpc-url <rpc-url> \
  --from-block 235206778 \
  --finalized-block <finalized-block-number> \
  --finalized-block-timestamp <finalized-block-timestamp-iso>
```

`--finalized-block` and `--finalized-block-timestamp` are required so the output
is reproducible and reorg-safe. Use a block that has enough finality for the
environment you are publishing.

If you start after historical `PoolCreated` events, include known pools:

```bash
npm run export:sqd --workspace @yieldshield-lite/points-sqd -- \
  --output "$SNAPSHOT_DIR" \
  --rpc-url <rpc-url> \
  --from-block <later-start-block> \
  --finalized-block <finalized-block-number> \
  --finalized-block-timestamp <finalized-block-timestamp-iso> \
  --pool-address-allowlist 0xpool1,0xpool2
```

Inspect the generated files:

```bash
ls "$SNAPSHOT_DIR"
ls "$SNAPSHOT_DIR/users" | head
shasum -a 256 "$SNAPSHOT_DIR/manifest.json"
```

## Publish The Snapshot To IPFS

Use the bundled publisher instead of `ipfs add -r` directly on a reused output
directory:

```bash
npm run publish:ipfs --workspace @yieldshield-lite/points-sqd -- \
  --dir "$SNAPSHOT_DIR"
```

The publisher stages a clean directory containing only `manifest.json` and files
listed in the manifest, verifies each listed file's SHA-256 hash and byte
length, and then runs `ipfs add`. The printed `Snapshot CID` is the root CID for
the snapshot directory.

Do not write that CID back into `manifest.json` before publishing the same
directory. Changing `manifest.json` changes the directory CID.

For a registry update, compute the manifest hash:

```bash
MANIFEST_HASH="0x$(shasum -a 256 "$SNAPSHOT_DIR/manifest.json" | awk '{print $1}')"
```

Then update your registry with:

- the root snapshot CID printed by `publish:ipfs`
- the finalized block number used in the export
- `MANIFEST_HASH`
- schema version `1`

Keep the snapshot pinned from at least one operator node or pinning service.
Multiple independent runners can pin the same CID.

If you are using DNSLink instead of the registry, update the DNS TXT record:

```text
_dnslink.points.yieldshield.example TXT dnslink=/ipfs/<snapshot-cid>
```

Use the actual DNSLink name from `VITE_POINTS_SNAPSHOT_DNSLINK_NAME`, and keep
the old snapshot pinned until DNS and gateway caches have aged out.

## Build The Frontend

Configure `.env` for one of the points modes above. Then build:

```bash
npm run typecheck
npm run build
```

The Vite config uses relative asset paths, so the app can be served from an IPFS
CID path or a CID subdomain.

## Publish The Frontend To IPFS

Publish the built app directory:

```bash
ipfs add -r --cid-version=1 --pin=true apps/web/dist
```

The root directory CID is the last CID printed by Kubo. Open it through a gateway:

```text
https://ipfs.io/ipfs/<frontend-cid>/#/points
https://dweb.link/ipfs/<frontend-cid>/#/points
```

If you use DNSLink, point your domain's `_dnslink` record at the frontend CID,
for example:

```text
dnslink=/ipfs/<frontend-cid>
```

## Refreshing Over Time

Use this decision table when new point data is available:

| Snapshot pointer mode | Need frontend redeploy for new snapshot? | What to update |
| --- | --- | --- |
| No snapshot | No | Nothing; only personal browser points are available |
| Embedded `./points-snapshots` | Yes | Rebuild and republish frontend |
| Fixed `VITE_POINTS_SNAPSHOT_CID` | Yes | Rebuild and republish frontend with the new CID |
| Mutable manifest/base URL | No | Update the URL target or hosted files |
| `VITE_POINTS_SNAPSHOT_DNSLINK_NAME` | No | Update the DNSLink TXT record |
| IPNS or ENS contenthash via `VITE_POINTS_SNAPSHOT_MANIFEST_URL` | No | Update the alias target |
| On-chain snapshot registry | No | Publish/pin snapshot, then update registry pointer |

The recommended first production path is DNSLink plus runner signatures, with
multiple operators pinning the published snapshot CID. Use the on-chain registry
when the points pointer needs an on-chain manifest hash and governance trail.

## Smoke Test Checklist

After publishing:

- Open `/#/points` from at least two gateways.
- Connect a wallet and confirm personal points either scan locally or fall back
  to the configured snapshot.
- Confirm global stats and leaderboard load when a snapshot source is configured.
- Confirm a user not present in the snapshot shows zero points instead of a hard
  error.
- Hard-refresh on a nested route to confirm `HashRouter` deep links work.
- Check the browser console for failed asset paths; static assets should resolve
  relative to the IPFS gateway URL.

## Related Docs

- [Decentralized points snapshots](./decentralized-points-snapshots.md)
- [Points snapshot contract](./points-snapshot-contract.md)
- [Architecture](./architecture.md)
