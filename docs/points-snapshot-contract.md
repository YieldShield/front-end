# Points Snapshot Contract

YieldShield front end can consume points data from static JSON snapshots instead of a
live GraphQL endpoint.

## Base URL Layout

The frontend expects a base URL from `VITE_POINTS_SNAPSHOT_BASE_URL` with the
following files:

```text
<base>/manifest.json
<base>/leaderboard.json
<base>/stats.json
<base>/users/<lowercase-address>.json
```

## `manifest.json`

The manifest is the trust boundary for static snapshots. Browsers can fetch it
first, verify required metadata, and check the SHA-256 hash of each snapshot
file before using the data.

```json
{
  "format": "yieldshield-lite/points-snapshot-manifest",
  "schemaVersion": 1,
  "snapshotVersion": 1,
  "chainId": 421614,
  "source": "sqd",
  "fromBlock": 235206778,
  "finalizedBlockNumber": 235206900,
  "finalizedBlockTimestamp": "2026-04-08T12:00:00.000Z",
  "generatedAt": "2026-04-08T12:00:00.000Z",
  "rulesVersion": "yieldshield-lite-points-v1",
  "exporterVersion": "0.1.0",
  "actionsHash": "e7b0f5f4f4e2f2636f1d06476f6a39ac8b987d7ab1d897b35334f1c0bb5ab9fe",
  "files": [
    {
      "path": "leaderboard.json",
      "sha256": "2f8df4c20c9b4b9ef7b5f55be6ef54b9aaf0bde58f29ff4f5a3ba1d857e1c1f0",
      "bytes": 1012,
      "contentType": "application/json"
    }
  ],
  "snapshotCid": null,
  "runnerSignatures": []
}
```

## Shared Metadata

All snapshot payloads include:

```json
{
  "metadata": {
    "format": "yieldshield-lite/points-snapshot",
    "version": 1,
    "generatedAt": "2026-04-08T12:00:00.000Z",
    "chainId": 421614,
    "source": "sqd",
    "fromBlock": 235206778,
    "finalizedBlockNumber": 235206900,
    "finalizedBlockTimestamp": "2026-04-08T12:00:00.000Z",
    "rulesVersion": "yieldshield-lite-points-v1",
    "exporterVersion": "0.1.0"
  }
}
```

## `leaderboard.json`

```json
{
  "metadata": {
    "format": "yieldshield-lite/points-snapshot",
    "version": 1,
    "generatedAt": "2026-04-08T12:00:00.000Z",
    "chainId": 421614,
    "source": "sqd",
    "fromBlock": 235206778,
    "finalizedBlockNumber": 235206900,
    "finalizedBlockTimestamp": "2026-04-08T12:00:00.000Z",
    "rulesVersion": "yieldshield-lite-points-v1",
    "exporterVersion": "0.1.0"
  },
  "totalUsers": 2,
  "totalDistributedPoints": "3800",
  "users": [
    {
      "userAddress": "0x1111111111111111111111111111111111111111",
      "totalPoints": "2500",
      "lastUpdated": "2026-04-08T11:55:00.000Z"
    },
    {
      "userAddress": "0x2222222222222222222222222222222222222222",
      "totalPoints": "1300",
      "lastUpdated": "2026-04-08T11:54:00.000Z"
    }
  ]
}
```

## `stats.json`

```json
{
  "metadata": {
    "format": "yieldshield-lite/points-snapshot",
    "version": 1,
    "generatedAt": "2026-04-08T12:00:00.000Z",
    "chainId": 421614,
    "source": "sqd",
    "fromBlock": 235206778,
    "finalizedBlockNumber": 235206900,
    "finalizedBlockTimestamp": "2026-04-08T12:00:00.000Z",
    "rulesVersion": "yieldshield-lite-points-v1",
    "exporterVersion": "0.1.0"
  },
  "totalUsers": 2,
  "totalDistributedPoints": "3800"
}
```

## `users/<address>.json`

```json
{
  "metadata": {
    "format": "yieldshield-lite/points-snapshot",
    "version": 1,
    "generatedAt": "2026-04-08T12:00:00.000Z",
    "chainId": 421614,
    "source": "sqd",
    "fromBlock": 235206778,
    "finalizedBlockNumber": 235206900,
    "finalizedBlockTimestamp": "2026-04-08T12:00:00.000Z",
    "rulesVersion": "yieldshield-lite-points-v1",
    "exporterVersion": "0.1.0"
  },
  "user": {
    "userAddress": "0x1111111111111111111111111111111111111111",
    "totalPoints": "2500",
    "lastUpdated": "2026-04-08T11:55:00.000Z"
  },
  "rank": 1,
  "streak": {
    "userAddress": "0x1111111111111111111111111111111111111111",
    "currentStreak": "4",
    "lastActiveDate": "2026-04-08",
    "longestStreak": "4"
  },
  "questCompletions": [
    {
      "id": "0x1111111111111111111111111111111111111111:saver_first_shield",
      "userAddress": "0x1111111111111111111111111111111111111111",
      "questId": "saver_first_shield",
      "points": "500",
      "completedAt": "2026-04-07T18:00:00.000Z",
      "poolAddress": "0x3333333333333333333333333333333333333333"
    }
  ]
}
```
