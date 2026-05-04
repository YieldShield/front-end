import { PoolHealthDot } from "../../../components/PoolHealthDot";
import { formatUsdDisplay } from "../../../protocol/format";
import type { PoolPositionGroup } from "../../../hooks/useMultiPoolAggregation";

interface PoolsSummaryListProps {
  poolGroups: PoolPositionGroup[];
  isLoading?: boolean;
  onPoolClick: (poolAddress: string) => void;
}

export function PoolsSummaryList({
  poolGroups,
  isLoading = false,
  onPoolClick,
}: PoolsSummaryListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        <h3 className="text-lg font-bold">Your Pools</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="card bg-base-200 h-32 animate-pulse">
              <div className="card-body p-4">
                <div className="h-4 w-24 bg-base-300 rounded mb-2" />
                <div className="h-8 w-20 bg-base-300 rounded mb-2" />
                <div className="h-3 w-16 bg-base-300 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (poolGroups.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-bold">Your Pools</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {poolGroups.map(group => {
          const valueUsd = Number(group.aggregated.totalValueAtDeposit) / 1e8;

          return (
            <div
              key={group.poolAddress}
              className="card bg-base-200 overflow-hidden transition-all duration-300 cursor-pointer hover:border-secondary/25"
              onClick={() => onPoolClick(group.poolAddress)}
            >
              <div className="card-body p-4 relative">
                {/* Header: token icon + name + health */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                      style={{ background: "var(--ys-gradient-brand)" }}
                    >
                      {group.pool.shieldedTokenSymbol.slice(0, 2)}
                    </div>
                    <p className="font-semibold text-sm">
                      {group.pool.shieldedTokenSymbol} / {group.pool.backingTokenSymbol}
                    </p>
                  </div>
                  <PoolHealthDot
                    shieldedBalance={group.pool.shieldedBalance}
                    backingBalance={group.pool.backingBalance}
                    collateralRatio={group.pool.collateralRatio}
                    shieldedTokenDecimals={group.pool.shieldedTokenDecimals}
                    backingTokenDecimals={group.pool.backingTokenDecimals}
                  />
                </div>

                {/* Balance */}
                <p className="text-2xl font-bold mb-2" style={{ color: "var(--ys-brand-secondary)" }}>
                  {formatUsdDisplay(valueUsd)}
                </p>

                {/* Footer: fee rate + position count */}
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium" style={{ color: "var(--ys-success)" }}>
                    {group.feeRate.toFixed(2)}% fee
                  </span>
                  <span className="text-font-grey">
                    {group.aggregated.positionCount}{" "}
                    {group.aggregated.positionCount === 1 ? "shield" : "shields"}
                  </span>
                </div>

                {/* Chevron */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-font-grey">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
