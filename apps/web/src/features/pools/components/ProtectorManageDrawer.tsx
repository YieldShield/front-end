import { useEffect, useState } from "react";
import { parseUnits } from "viem";
import { Drawer } from "../../../components/Drawer";
import { useProtectorUnlock } from "../../../hooks/useProtectorUnlock";
import { formatTokenAmount } from "../../../protocol/format";
import type { ProtectorPosition } from "../../../protocol/positions";
import type { PoolSummary } from "../../../protocol/pools";

type ProtectorManageDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  pool: PoolSummary;
  positions: ProtectorPosition[];
};

export function ProtectorManageDrawer({ isOpen, onClose, pool, positions }: ProtectorManageDrawerProps) {
  const [selectedTokenId, setSelectedTokenId] = useState<bigint | null>(positions[0]?.tokenId ?? null);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const { startUnlock, cancelUnlock, withdrawProtector, isProcessing } = useProtectorUnlock();

  useEffect(() => {
    if (positions.length === 0) {
      setSelectedTokenId(null);
      return;
    }

    setSelectedTokenId(currentTokenId =>
      currentTokenId !== null && positions.some(position => position.tokenId === currentTokenId)
        ? currentTokenId
        : positions[0].tokenId,
    );
  }, [positions]);

  const selectedPosition = positions.find(p => p.tokenId === selectedTokenId);
  const now = Math.floor(Date.now() / 1000);

  const unlockNotStarted = selectedPosition && selectedPosition.unlockRequestTime === 0;
  const unlockInProgress = selectedPosition && selectedPosition.unlockRequestTime > 0 && selectedPosition.unlockRequestTime > now;
  const unlockReady = selectedPosition && selectedPosition.unlockRequestTime > 0 && selectedPosition.unlockRequestTime <= now;

  const timeRemaining = unlockInProgress && selectedPosition
    ? selectedPosition.unlockRequestTime - now
    : 0;

  const formatDuration = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    if (days > 0) return `${days}d ${hours}h`;
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${mins}m`;
  };

  const parsedWithdrawAmount = (() => {
    try {
      return withdrawAmount ? parseUnits(withdrawAmount, pool.backingTokenDecimals) : 0n;
    } catch {
      return 0n;
    }
  })();

  async function handleStartUnlock() {
    if (!selectedPosition) return;
    try {
      await startUnlock(pool.address, selectedPosition.tokenId);
    } catch { /* handled */ }
  }

  async function handleCancelUnlock() {
    if (!selectedPosition) return;
    try {
      await cancelUnlock(pool.address, selectedPosition.tokenId);
    } catch { /* handled */ }
  }

  async function handleWithdraw() {
    if (!selectedPosition) return;
    try {
      await withdrawProtector({
        poolAddress: pool.address,
        tokenId: selectedPosition.tokenId,
        amount: parsedWithdrawAmount > 0n ? parsedWithdrawAmount : 0n, // 0 = full withdrawal
        preferredAsset: pool.backingToken,
        shieldedToken: pool.shieldedToken,
        backingToken: pool.backingToken,
        minAmountOut: 0n,
      });
      setWithdrawAmount("");
      onClose();
    } catch { /* handled */ }
  }

  return (
    <Drawer isOpen={isOpen} onClose={onClose} isLocked={isProcessing}>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Manage Protector Position</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose} disabled={isProcessing}>&#10005;</button>
        </div>

        {positions.length === 0 ? (
          <p className="text-base-content/60">No protector positions in this pool.</p>
        ) : (
          <>
            {positions.length > 1 && (
              <select
                className="select select-bordered w-full"
                value={selectedTokenId?.toString() ?? ""}
                onChange={e => setSelectedTokenId(BigInt(e.target.value))}
                disabled={isProcessing}
              >
                {positions.map(p => (
                  <option key={p.tokenId.toString()} value={p.tokenId.toString()}>
                    #{p.tokenId.toString()} — {formatTokenAmount(p.amount, pool.backingTokenDecimals)} {pool.backingTokenSymbol}
                  </option>
                ))}
              </select>
            )}

            {selectedPosition && (
              <div className="card bg-base-100 p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-base-content/60">Total amount</span>
                  <span>{formatTokenAmount(selectedPosition.amount, pool.backingTokenDecimals)} {pool.backingTokenSymbol}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-base-content/60">Locked</span>
                  <span>{formatTokenAmount(selectedPosition.lockedAmount, pool.backingTokenDecimals)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-base-content/60">Available</span>
                  <span>{formatTokenAmount(selectedPosition.availableAmount, pool.backingTokenDecimals)}</span>
                </div>
                {selectedPosition.claimableCommission > 0n && (
                  <div className="flex justify-between">
                    <span className="text-base-content/60">Claimable commission</span>
                    <span className="text-success">{formatTokenAmount(selectedPosition.claimableCommission, pool.shieldedTokenDecimals)}</span>
                  </div>
                )}
              </div>
            )}

            {unlockNotStarted && (
              <div className="space-y-3">
                <p className="text-sm text-base-content/60">
                  Start the unlock process to withdraw your protector position. The unlock period must complete before withdrawal.
                </p>
                <button className="btn btn-primary w-full" onClick={handleStartUnlock} disabled={isProcessing}>
                  {isProcessing ? "Processing..." : "Start Unlock"}
                </button>
              </div>
            )}

            {unlockInProgress && (
              <div className="space-y-3">
                <div className="alert">
                  <div>
                    <p className="font-medium">Unlock in progress</p>
                    <p className="text-sm">{formatDuration(timeRemaining)} remaining</p>
                  </div>
                </div>
                <button className="btn btn-outline btn-error w-full" onClick={handleCancelUnlock} disabled={isProcessing}>
                  {isProcessing ? "Processing..." : "Cancel Unlock"}
                </button>
              </div>
            )}

            {unlockReady && (
              <div className="space-y-3">
                <div className="alert alert-success">
                  <p className="font-medium">Unlock complete — ready to withdraw</p>
                </div>
                <input
                  type="text"
                  inputMode="decimal"
                  className="input input-bordered w-full"
                  placeholder="Amount (0 for full withdrawal)"
                  value={withdrawAmount}
                  onChange={e => setWithdrawAmount(e.target.value)}
                  disabled={isProcessing}
                />
                <button className="btn btn-primary w-full" onClick={handleWithdraw} disabled={isProcessing}>
                  {isProcessing ? "Processing..." : "Withdraw"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </Drawer>
  );
}
