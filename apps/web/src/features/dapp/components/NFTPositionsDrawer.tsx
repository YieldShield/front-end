import { useState } from "react";
import { Drawer } from "../../../components/Drawer";
import { formatTokenAmount, formatTimestamp, formatUsdDisplay } from "../../../protocol/format";
import type { ShieldPositionWithPool } from "../../../hooks/useMultiPoolAggregation";

interface NFTPositionsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  positions: ShieldPositionWithPool[];
  onWithdraw: (tokenId: bigint) => void;
}

export function NFTPositionsDrawer({
  isOpen,
  onClose,
  positions,
  onWithdraw,
}: NFTPositionsDrawerProps) {
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  const totalShieldedUsd = positions.reduce(
    (sum, p) => sum + Number(p.valueAtDeposit) / 1e8,
    0,
  );

  return (
    <Drawer isOpen={isOpen} onClose={onClose}>
      {/* Header */}
      <div className="p-4 border-b border-base-300">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">Your Shield Positions</h3>
          <button onClick={onClose} className="btn btn-ghost btn-circle">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4">
        {/* Coverage summary */}
        <div className="rounded-xl p-4" style={{ backgroundColor: "var(--ys-success-bg-strong)" }}>
          <div className="flex items-center gap-2 mb-1">
            <svg className="w-5 h-5" style={{ color: "var(--ys-success)" }} viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3z" />
            </svg>
            <span className="font-semibold text-sm" style={{ color: "var(--ys-success)" }}>
              Total Shielded
            </span>
          </div>
          <p className="text-2xl font-bold" style={{ color: "var(--ys-success)" }}>
            {formatUsdDisplay(totalShieldedUsd)}
          </p>
          <p className="text-xs text-font-grey mt-1">
            {positions.length} {positions.length === 1 ? "position" : "positions"} across all pools
          </p>
        </div>

        {/* Position cards */}
        {positions.map(pos => (
          <div key={`${pos.poolAddress}-${pos.tokenId}`} className="card bg-base-100 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="badge badge-sm badge-secondary">#{String(pos.tokenId)}</span>
                <span className="font-semibold text-sm">
                  {pos.shieldedTokenSymbol} / {pos.backingTokenSymbol}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-font-grey text-xs block">Amount</span>
                <span className="font-medium">
                  {formatTokenAmount(pos.amount, pos.shieldedTokenDecimals)} {pos.shieldedTokenSymbol}
                </span>
              </div>
              <div>
                <span className="text-font-grey text-xs block">Value at Deposit</span>
                <span className="font-medium">{formatUsdDisplay(Number(pos.valueAtDeposit) / 1e8)}</span>
              </div>
              <div>
                <span className="text-font-grey text-xs block">Deposited</span>
                <span className="font-medium">{formatTimestamp(BigInt(pos.depositTime))}</span>
              </div>
            </div>

            <button
              onClick={() => onWithdraw(pos.tokenId)}
              className="btn btn-outline btn-sm w-full"
            >
              Withdraw
            </button>
          </div>
        ))}

        {positions.length === 0 && (
          <div className="text-center text-font-grey py-8">No active shield positions.</div>
        )}

        {/* How It Works */}
        <div className="border-t border-base-300 pt-4">
          <button
            onClick={() => setShowHowItWorks(!showHowItWorks)}
            className="flex items-center gap-2 text-sm font-medium text-secondary cursor-pointer"
          >
            <svg
              className={`w-4 h-4 transition-transform ${showHowItWorks ? "rotate-90" : ""}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
            How It Works
          </button>
          {showHowItWorks && (
            <div className="mt-3 space-y-2 text-sm text-font-grey">
              <p>Each shield position is an NFT representing your protected deposit.</p>
              <p>Your principal is protected by on-chain collateral from protectors.</p>
              <p>You can withdraw anytime — full or partial — receiving your original token or activating the shield to receive the backing token at oracle price.</p>
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
}
