import { useEffect, useMemo, useState } from "react";
import { type Address, parseUnits } from "viem";
import { Drawer } from "../../../components/Drawer";
import { TransactionSteps } from "../../../components/TransactionSteps";
import { useWithdraw } from "../../../hooks/useWithdraw";
import { formatTokenAmount } from "../../../protocol/format";
import type { ShieldPosition } from "../../../protocol/positions";
import type { PoolSummary } from "../../../protocol/pools";

type WithdrawDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  pool: PoolSummary;
  positions: ShieldPosition[];
};

export function WithdrawDrawer({ isOpen, onClose, pool, positions }: WithdrawDrawerProps) {
  const activePositions = useMemo(() => positions.filter(p => !p.isWithdrawn), [positions]);
  const [selectedTokenId, setSelectedTokenId] = useState<bigint | null>(activePositions[0]?.tokenId ?? null);
  const [isPartial, setIsPartial] = useState(false);
  const [partialAmount, setPartialAmount] = useState("");
  const [useBackingAsset, setUseBackingAsset] = useState(false);

  const { withdrawFull, withdrawPartial, isWithdrawing, steps } = useWithdraw();

  useEffect(() => {
    if (activePositions.length === 0) {
      setSelectedTokenId(null);
      return;
    }

    setSelectedTokenId(currentTokenId =>
      currentTokenId !== null && activePositions.some(position => position.tokenId === currentTokenId)
        ? currentTokenId
        : activePositions[0].tokenId,
    );
  }, [activePositions]);

  const selectedPosition = activePositions.find(p => p.tokenId === selectedTokenId);
  const preferredAsset = useBackingAsset ? pool.backingToken : pool.shieldedToken;

  const parsedPartialAmount = (() => {
    try {
      return partialAmount ? parseUnits(partialAmount, pool.shieldedTokenDecimals) : 0n;
    } catch {
      return 0n;
    }
  })();

  async function handleWithdraw() {
    if (!selectedPosition) return;

    try {
      if (isPartial && parsedPartialAmount > 0n) {
        await withdrawPartial({
          poolAddress: pool.address,
          tokenId: selectedPosition.tokenId,
          amount: parsedPartialAmount,
          preferredAsset,
          shieldedToken: pool.shieldedToken,
          backingToken: pool.backingToken,
          minAmountOut: 0n,
        });
      } else {
        await withdrawFull({
          poolAddress: pool.address,
          tokenId: selectedPosition.tokenId,
          preferredAsset,
          shieldedToken: pool.shieldedToken,
          backingToken: pool.backingToken,
          minAmountOut: 0n,
        });
      }
      onClose();
    } catch {
      // Error handled by hook
    }
  }

  return (
    <Drawer isOpen={isOpen} onClose={onClose} isLocked={isWithdrawing}>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Withdraw</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose} disabled={isWithdrawing}>&#10005;</button>
        </div>

        {activePositions.length === 0 ? (
          <p className="text-base-content/60">No active shield positions in this pool.</p>
        ) : (
          <>
            {/* Position selector */}
            {activePositions.length > 1 && (
              <div className="space-y-1">
                <label className="text-sm font-medium">Position</label>
                <select
                  className="select select-bordered w-full"
                  value={selectedTokenId?.toString() ?? ""}
                  onChange={e => setSelectedTokenId(BigInt(e.target.value))}
                  disabled={isWithdrawing}
                >
                  {activePositions.map(p => (
                    <option key={p.tokenId.toString()} value={p.tokenId.toString()}>
                      #{p.tokenId.toString()} — {formatTokenAmount(p.amount, pool.shieldedTokenDecimals)} {pool.shieldedTokenSymbol}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {selectedPosition && (
              <div className="text-sm text-base-content/60">
                Position amount: {formatTokenAmount(selectedPosition.amount, pool.shieldedTokenDecimals)} {pool.shieldedTokenSymbol}
              </div>
            )}

            {/* Withdrawal type */}
            <div className="flex gap-2">
              <button
                className={`btn btn-sm flex-1 ${!isPartial ? "btn-primary" : "btn-outline"}`}
                onClick={() => setIsPartial(false)}
                disabled={isWithdrawing}
              >
                Full
              </button>
              <button
                className={`btn btn-sm flex-1 ${isPartial ? "btn-primary" : "btn-outline"}`}
                onClick={() => setIsPartial(true)}
                disabled={isWithdrawing}
              >
                Partial
              </button>
            </div>

            {isPartial && (
              <input
                type="text"
                inputMode="decimal"
                className="input input-bordered w-full"
                placeholder="Amount to withdraw"
                value={partialAmount}
                onChange={e => setPartialAmount(e.target.value)}
                disabled={isWithdrawing}
              />
            )}

            {/* Preferred asset */}
            <div className="space-y-1">
              <label className="text-sm font-medium">Receive as</label>
              <div className="flex gap-2">
                <button
                  className={`btn btn-sm flex-1 ${!useBackingAsset ? "btn-primary" : "btn-outline"}`}
                  onClick={() => setUseBackingAsset(false)}
                  disabled={isWithdrawing}
                >
                  {pool.shieldedTokenSymbol}
                </button>
                <button
                  className={`btn btn-sm flex-1 ${useBackingAsset ? "btn-primary" : "btn-outline"}`}
                  onClick={() => setUseBackingAsset(true)}
                  disabled={isWithdrawing}
                >
                  {pool.backingTokenSymbol} (Shield)
                </button>
              </div>
            </div>

            {isWithdrawing && (
              <div className="card bg-base-100 p-4">
                <TransactionSteps steps={steps} />
              </div>
            )}

            <button
              className="btn btn-primary w-full"
              onClick={handleWithdraw}
              disabled={!selectedPosition || isWithdrawing || (isPartial && parsedPartialAmount === 0n)}
            >
              {isWithdrawing ? "Withdrawing..." : isPartial ? "Withdraw Partial" : "Withdraw Full"}
            </button>
          </>
        )}
      </div>
    </Drawer>
  );
}
