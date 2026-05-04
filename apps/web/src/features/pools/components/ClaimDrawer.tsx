import { Drawer } from "../../../components/Drawer";
import { useClaim } from "../../../hooks/useClaim";
import { formatTokenAmount, formatTimestamp } from "../../../protocol/format";
import type { ShieldPosition, ProtectorPosition } from "../../../protocol/positions";
import type { PoolSummary } from "../../../protocol/pools";

type ClaimDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  pool: PoolSummary;
  shieldPositions: ShieldPosition[];
  protectorPositions: ProtectorPosition[];
};

export function ClaimDrawer({ isOpen, onClose, pool, shieldPositions, protectorPositions }: ClaimDrawerProps) {
  const { claimRewards, claimCommission, isClaiming } = useClaim();

  const activeShieldPositions = shieldPositions.filter(p => !p.isWithdrawn);
  const claimableProtectors = protectorPositions.filter(p => p.claimableCommission > 0n);

  async function handleClaimRewards(tokenId: bigint) {
    try {
      await claimRewards(pool.address, tokenId);
    } catch {
      // Handled by hook
    }
  }

  async function handleClaimCommission(tokenId: bigint) {
    try {
      await claimCommission(pool.address, tokenId);
    } catch {
      // Handled by hook
    }
  }

  return (
    <Drawer isOpen={isOpen} onClose={onClose} isLocked={isClaiming}>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Claim</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose} disabled={isClaiming}>&#10005;</button>
        </div>

        {/* Shield yield fees */}
        {activeShieldPositions.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold">Yield Fees (Shield Positions)</h3>
            {activeShieldPositions.map(p => (
              <div key={p.tokenId.toString()} className="card bg-base-100 p-3 flex items-center justify-between">
                <div className="text-sm">
                  <div>#{p.tokenId.toString()} — {formatTokenAmount(p.amount, pool.shieldedTokenDecimals)} {pool.shieldedTokenSymbol}</div>
                  <div className="text-xs text-base-content/50">
                    Last claim: {p.lastFeeClaimTime > 0 ? formatTimestamp(BigInt(p.lastFeeClaimTime)) : "Never"}
                  </div>
                </div>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => handleClaimRewards(p.tokenId)}
                  disabled={isClaiming}
                >
                  Claim
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Protector commissions */}
        {claimableProtectors.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold">Commissions (Protector Positions)</h3>
            {claimableProtectors.map(p => (
              <div key={p.tokenId.toString()} className="card bg-base-100 p-3 flex items-center justify-between">
                <div className="text-sm">
                  <div>#{p.tokenId.toString()} — {formatTokenAmount(p.claimableCommission, pool.shieldedTokenDecimals)} claimable</div>
                </div>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => handleClaimCommission(p.tokenId)}
                  disabled={isClaiming}
                >
                  Claim
                </button>
              </div>
            ))}
          </div>
        )}

        {activeShieldPositions.length === 0 && claimableProtectors.length === 0 && (
          <p className="text-base-content/60">No claimable amounts in this pool.</p>
        )}
      </div>
    </Drawer>
  );
}
