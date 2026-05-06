# @yieldshield/points-core

Shared points rules, event normalization, and snapshot contracts for YieldShield
Lite.

This package is intended to be used by:

- the browser app when rendering quests and computing connected-wallet points
- the SQD exporter when materializing points snapshots
- any future validation or backfill scripts that need a single points contract

The package is intentionally dependency-light and only contains pure data and
helpers.
