# Decentralized Points Snapshots

YieldShield Lite keeps the browser app deployable to IPFS by avoiding required
live backend dependencies for points.

## Architecture

```text
IPFS-hosted frontend
  -> connected wallet
  -> browser RPC log scan for that wallet only
  -> shared points-core rules
  -> personal points, quests, and streak

SQD/raw RPC runner
  -> deterministic open-source points exporter
  -> IPFS snapshot CID
  -> optional fallback/global data for rank, leaderboard, and totals
```

IPFS stores and serves the app and snapshot artifacts. IPFS does not run the SQD
export job. The exporter is normal compute that can run locally, in CI, on a
VPS, or by any independent operator.

## Default Browser Wallet Mode

The default frontend mode is `VITE_POINTS_PROVIDER=browser`. In this mode the
browser computes only the connected wallet's personal points:

- scans `PoolCreated` logs from the factory to discover pool contracts and award
  creator points when the connected wallet is the non-indexed creator
- scans pool event logs with `topic1 == connectedWallet`, so pool activity for
  other users is not fetched or scored
- applies the shared rules from `@yieldshield-lite/points-core`
- caches the wallet's normalized actions and scan cursor in `localStorage`
- scans only new finalized blocks on later page loads

The browser mode cannot honestly compute global rank, total distributed points,
or the leaderboard without indexing everyone. Those views stay behind the SQD
snapshot fallback.

Recommended browser defaults:

```text
VITE_POINTS_PROVIDER=browser
VITE_POINTS_BROWSER_FINALITY_CONFIRMATIONS=20
VITE_POINTS_BROWSER_BLOCK_CHUNK_SIZE=50000
VITE_POINTS_BROWSER_POOL_ADDRESS_CHUNK_SIZE=50
VITE_POINTS_BROWSER_CACHE=true
```

Set `VITE_POINTS_BROWSER_FROM_BLOCK` only when testing a later deployment or a
shorter local block range. The default Arbitrum Sepolia start block is the
current factory deployment start block.

## Why Snapshots Still Exist

- no browser secrets
- no production Graph gateway key
- no required API route
- points remain optional advisory data
- identical inputs can produce identical IPFS CIDs

## No Single Point Of Failure

The initial demo can embed snapshots in the frontend build. Production should
avoid relying on one publisher or one gateway:

- anyone can run the exporter for the same finalized block range
- snapshots are deterministic and content-addressed
- multiple runners can pin the same CID
- a manifest records file hashes, rules version, block range, and signatures
- the frontend can resolve the latest manifest through a decentralized pointer

Preferred first production latest-pointer path:

```text
browser fetch
  -> DNSLink name through IPFS gateway /ipns/<name>
  -> latest snapshot CID from DNS TXT record
  -> IPFS gateway failover
  -> manifest validation
  -> optional runner signature validation
  -> snapshot file fetches
```

DNSLink is the recommended first production pointer path, especially when paired
with runner signatures and multiple operators pinning the same CID. An on-chain
registry is also supported as an optional future path when the pointer itself
needs an on-chain manifest hash and governance trail.

## First IPFS Smoke Test

```bash
npm run points:export:sample:web -- --rewrite-user-address <your-wallet>
npm run build
ipfs add -r apps/web/dist
```

Use these frontend values for browser-default points plus embedded snapshot
fallback/global data:

```text
VITE_POINTS_PROVIDER=browser
VITE_POINTS_SNAPSHOT_BASE_URL=./points-snapshots
```

Open:

```text
https://<gateway>/ipfs/<frontend-cid>/#/points
```

## Live Export

The SQD job is a runner/exporter fallback, not a required browser dependency. It
can use an SQD gateway, a normal RPC endpoint, or both:

```bash
npm run export:sqd --workspace @yieldshield-lite/points-sqd -- \
  --output ./dist/snapshots \
  --gateway-url https://v2.archive.subsquid.io/network/arbitrum-sepolia \
  --rpc-url <rpc-url> \
  --from-block 235206778 \
  --finalized-block <finalized-block-number> \
  --finalized-block-timestamp <finalized-block-timestamp-iso>
```

The production browser does not need an SQD gateway. A gateway is useful for
runners because it is faster and cheaper for historical reads. If operators want
to avoid relying on any SQD-hosted gateway, they can run the same exporter
against RPC only, then compare the resulting manifest and file hashes with other
runners.

## Determinism Check

Two runners should produce the same hashes when they use the same code, rules,
block range, finalized block metadata, and chain data:

```bash
npm run export:sqd --workspace @yieldshield-lite/points-sqd -- \
  --output /tmp/yieldshield-run-a \
  --finalized-block <block> \
  --finalized-block-timestamp <iso>

npm run export:sqd --workspace @yieldshield-lite/points-sqd -- \
  --output /tmp/yieldshield-run-b \
  --finalized-block <block> \
  --finalized-block-timestamp <iso>

diff -ru /tmp/yieldshield-run-a /tmp/yieldshield-run-b
```

The automated SQD tests also lock byte-identical snapshot output for identical
inputs:

```bash
npm run test --workspace @yieldshield-lite/points-sqd
```

## Publish Snapshots

Publish a completed snapshot directory to IPFS:

```bash
npm run publish:ipfs --workspace @yieldshield-lite/points-sqd -- \
  --dir ./dist/snapshots
```

Do not write the resulting CID back into `manifest.json` before publishing the
same directory. That would change the manifest bytes and produce a different
CID. Store the CID in one of these places instead:

- `VITE_POINTS_SNAPSHOT_CID` for fixed frontend builds
- `VITE_POINTS_SNAPSHOT_DNSLINK_NAME` for the recommended DNSLink-backed mutable pointer
- IPNS or ENS contenthash through `VITE_POINTS_SNAPSHOT_MANIFEST_URL` for convenience aliases
- an optional on-chain latest-snapshot registry when the pointer needs on-chain governance

## Frontend Modes

Default browser wallet mode with embedded fallback:

```text
VITE_POINTS_PROVIDER=browser
VITE_POINTS_SNAPSHOT_BASE_URL=./points-snapshots
```

Browser-only personal points:

```text
VITE_POINTS_PROVIDER=browser
VITE_POINTS_SNAPSHOT_BASE_URL=
VITE_POINTS_SNAPSHOT_CID=
VITE_POINTS_SNAPSHOT_REGISTRY_ADDRESS=
```

Direct IPFS CID mode:

```text
VITE_POINTS_PROVIDER=browser
VITE_POINTS_SNAPSHOT_CID=bafy...
VITE_POINTS_SNAPSHOT_GATEWAYS=https://ipfs.io/ipfs/{cid},https://dweb.link/ipfs/{cid}
VITE_POINTS_SNAPSHOT_EXPECTED_CHAIN_ID=421614
```

DNSLink mutable pointer mode:

```text
VITE_POINTS_PROVIDER=browser
VITE_POINTS_SNAPSHOT_DNSLINK_NAME=points.yieldshield.example
VITE_POINTS_SNAPSHOT_DNSLINK_GATEWAYS=https://dweb.link/ipns/{name},https://ipfs.io/ipns/{name}
VITE_POINTS_SNAPSHOT_EXPECTED_CHAIN_ID=421614
VITE_POINTS_SNAPSHOT_ALLOWED_SIGNERS=0xrunner1,0xrunner2
VITE_POINTS_SNAPSHOT_SIGNATURE_THRESHOLD=1
```

Update the DNS TXT record on each new snapshot:

```text
_dnslink.points.yieldshield.example TXT dnslink=/ipfs/<snapshot-cid>
```

Optional on-chain latest-pointer mode:

```text
VITE_POINTS_PROVIDER=browser
VITE_POINTS_SNAPSHOT_REGISTRY_ADDRESS=0x...
VITE_POINTS_SNAPSHOT_REGISTRY_CHAIN_ID=421614
VITE_POINTS_SNAPSHOT_GATEWAYS=https://ipfs.io/ipfs/{cid},https://dweb.link/ipfs/{cid}
VITE_POINTS_SNAPSHOT_EXPECTED_CHAIN_ID=421614
```

When fallback snapshots are configured, the frontend fetches `manifest.json`
first, validates schema and chain id, checks file SHA-256 hashes, then reads
`leaderboard.json`, `stats.json`, and `users/<address>.json` only if browser
wallet scanning fails or a global view needs snapshot data.

## Snapshot Registry Interface

The frontend supports either `latestSnapshot()` or `latest()` with this return
shape:

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

`manifestHash` is the SHA-256 hash of the exact `manifest.json` bytes, encoded as
`bytes32`. `cid` is the root IPFS CID for the snapshot directory.

## Optional Runner Signatures

Set these values to require runner signatures in the browser:

```text
VITE_POINTS_SNAPSHOT_ALLOWED_SIGNERS=0xrunner1,0xrunner2
VITE_POINTS_SNAPSHOT_SIGNATURE_THRESHOLD=1
```

Runners sign this message:

```text
YieldShield Lite points snapshot
chainId:<chain-id>
fromBlock:<from-block>
finalizedBlockNumber:<finalized-block>
finalizedBlockTimestamp:<iso>
rulesVersion:<rules-version>
exporterVersion:<exporter-version>
actionsHash:<actions-hash>
files:<path:sha256:bytes|path:sha256:bytes>
```

Signatures are optional for the embedded smoke test. For production, pair the
recommended DNSLink pointer with a signer threshold so one runner cannot
silently replace the points view. A registry controlled by a multisig remains an
optional future alternative when the pointer itself needs on-chain governance.
