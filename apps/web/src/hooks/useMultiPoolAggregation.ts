import { useMemo } from "react";
import type { Address } from "viem";
import type { PoolSummary } from "../protocol/pools";
import type { ShieldPosition, UserPositions } from "../protocol/positions";

export type PoolPositionGroup = {
  poolAddress: Address;
  pool: PoolSummary;
  positions: ShieldPosition[];
  aggregated: {
    totalAmount: bigint;
    totalValueAtDeposit: bigint;
    positionCount: number;
  };
  feeRate: number;
};

export type MultiPoolAggregated = {
  totalValueUsd: number;
  poolCount: number;
  positionCount: number;
};

export type ShieldPositionWithPool = ShieldPosition & {
  shieldedTokenSymbol: string;
  backingTokenSymbol: string;
  shieldedTokenDecimals: number;
  backingTokenDecimals: number;
};

const ORACLE_PRICE_DECIMALS = 8;
const BPS_DIVISOR = 10_000;

export function useMultiPoolAggregation(
  positions: UserPositions | undefined,
  pools: PoolSummary[],
) {
  return useMemo(() => {
    const empty = {
      poolGroups: [] as PoolPositionGroup[],
      globalAggregated: { totalValueUsd: 0, poolCount: 0, positionCount: 0 } as MultiPoolAggregated,
      hasDeposits: false,
      allPositionsWithPool: [] as ShieldPositionWithPool[],
      isLoading: false,
    };

    if (!positions) return { ...empty, isLoading: true };

    const activePositions = positions.shieldPositions.filter(p => !p.isWithdrawn);

    if (activePositions.length === 0) return empty;

    const poolMap = new Map(pools.map(p => [p.address.toLowerCase(), p]));

    // Group by pool address
    const grouped = new Map<string, ShieldPosition[]>();
    for (const pos of activePositions) {
      const key = pos.poolAddress.toLowerCase();
      const existing = grouped.get(key);
      if (existing) {
        existing.push(pos);
      } else {
        grouped.set(key, [pos]);
      }
    }

    const poolGroups: PoolPositionGroup[] = [];
    const allPositionsWithPool: ShieldPositionWithPool[] = [];
    let totalValueUsd = 0;
    let totalPositionCount = 0;

    for (const [key, groupPositions] of grouped) {
      const pool = poolMap.get(key);
      if (!pool) continue;

      let totalAmount = 0n;
      let totalValueAtDeposit = 0n;

      for (const pos of groupPositions) {
        totalAmount += pos.amount;
        totalValueAtDeposit += pos.valueAtDeposit;

        allPositionsWithPool.push({
          ...pos,
          shieldedTokenSymbol: pool.shieldedTokenSymbol,
          backingTokenSymbol: pool.backingTokenSymbol,
          shieldedTokenDecimals: pool.shieldedTokenDecimals,
          backingTokenDecimals: pool.backingTokenDecimals,
        });
      }

      const feeRate = Number(pool.commissionRate + pool.poolFee) / BPS_DIVISOR * 100;

      poolGroups.push({
        poolAddress: pool.address,
        pool,
        positions: groupPositions,
        aggregated: { totalAmount, totalValueAtDeposit, positionCount: groupPositions.length },
        feeRate,
      });

      totalValueUsd += Number(totalValueAtDeposit) / 10 ** ORACLE_PRICE_DECIMALS;
      totalPositionCount += groupPositions.length;
    }

    // Sort by total value descending
    poolGroups.sort((a, b) =>
      Number(b.aggregated.totalValueAtDeposit - a.aggregated.totalValueAtDeposit),
    );

    return {
      poolGroups,
      globalAggregated: {
        totalValueUsd,
        poolCount: poolGroups.length,
        positionCount: totalPositionCount,
      },
      hasDeposits: totalPositionCount > 0,
      allPositionsWithPool,
      isLoading: false,
    };
  }, [positions, pools]);
}
