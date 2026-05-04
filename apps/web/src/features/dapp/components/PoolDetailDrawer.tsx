import { Drawer } from "../../../components/Drawer";
import { PoolHealthDot } from "../../../components/PoolHealthDot";
import { formatTokenAmount, formatBps, formatUsdDisplay } from "../../../protocol/format";
import type { PoolPositionGroup } from "../../../hooks/useMultiPoolAggregation";

interface PoolDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  group: PoolPositionGroup | null;
  onWithdrawPosition: (poolAddress: string, tokenId: bigint) => void;
}

export function PoolDetailDrawer({
  isOpen,
  onClose,
  group,
  onWithdrawPosition,
}: PoolDetailDrawerProps) {
  if (!group) return null;

  const pool = group.pool;
  const valueUsd = Number(group.aggregated.totalValueAtDeposit) / 1e8;

  return (
    <Drawer isOpen={isOpen} onClose={onClose}>
      {/* Header */}
      <div className="p-4 border-b border-base-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="btn btn-ghost btn-sm btn-circle">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <div>
              <h3 className="text-lg font-bold">
                {pool.shieldedTokenSymbol} / {pool.backingTokenSymbol}
              </h3>
              <p className="text-xs text-font-grey">Pool Detail</p>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-circle">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4">
        {/* Balance + fee */}
        <div className="card bg-base-100 p-4">
          <p className="text-sm text-font-grey mb-1">Your Balance</p>
          <p className="text-3xl font-bold" style={{ color: "var(--ys-brand-secondary)" }}>
            {formatUsdDisplay(valueUsd)}
          </p>
          <p className="text-sm mt-2">
            <span className="font-medium" style={{ color: "var(--ys-success)" }}>
              {group.feeRate.toFixed(2)}% fee
            </span>
            <span className="text-font-grey ml-2">
              ({formatBps(pool.commissionRate)} commission + {formatBps(pool.poolFee)} pool fee)
            </span>
          </p>
        </div>

        {/* Health */}
        <div className="card bg-base-100 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PoolHealthDot
                shieldedBalance={pool.shieldedBalance}
                backingBalance={pool.backingBalance}
                collateralRatio={pool.collateralRatio}
                shieldedTokenDecimals={pool.shieldedTokenDecimals}
                backingTokenDecimals={pool.backingTokenDecimals}
              />
              <span className="text-sm font-medium">Pool Health</span>
            </div>
            <span className="text-sm text-font-grey">
              Collateral: {formatBps(pool.collateralRatio)}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
            <div>
              <span className="text-font-grey text-xs block">Shielded Balance</span>
              <span className="font-medium">
                {formatTokenAmount(pool.shieldedBalance, pool.shieldedTokenDecimals)} {pool.shieldedTokenSymbol}
              </span>
            </div>
            <div>
              <span className="text-font-grey text-xs block">Backing Balance</span>
              <span className="font-medium">
                {formatTokenAmount(pool.backingBalance, pool.backingTokenDecimals)} {pool.backingTokenSymbol}
              </span>
            </div>
          </div>
        </div>

        {/* Positions */}
        <div>
          <h4 className="text-sm font-bold mb-3">
            Positions ({group.aggregated.positionCount})
          </h4>
          <div className="space-y-2">
            {group.positions.map(pos => (
              <div key={String(pos.tokenId)} className="card bg-base-100 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="badge badge-sm badge-secondary">
                        #{String(pos.tokenId)}
                      </span>
                      <span className="font-medium text-sm">
                        {formatTokenAmount(pos.amount, pool.shieldedTokenDecimals)} {pool.shieldedTokenSymbol}
                      </span>
                    </div>
                    <p className="text-xs text-font-grey mt-1">
                      {formatUsdDisplay(Number(pos.valueAtDeposit) / 1e8)} at deposit
                    </p>
                  </div>
                  <button
                    onClick={() => onWithdrawPosition(group.poolAddress, pos.tokenId)}
                    className="btn btn-outline btn-xs"
                  >
                    Withdraw
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Drawer>
  );
}
