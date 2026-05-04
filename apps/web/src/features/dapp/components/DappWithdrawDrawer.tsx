import { useState, useEffect } from "react";
import { type Address, parseUnits } from "viem";
import { Drawer } from "../../../components/Drawer";
import { TransactionSteps } from "../../../components/TransactionSteps";
import { useWithdraw } from "../../../hooks/useWithdraw";
import { formatTokenAmount, formatTimestamp } from "../../../protocol/format";
import type { ShieldPositionWithPool } from "../../../hooks/useMultiPoolAggregation";
import type { PoolSummary } from "../../../protocol/pools";

type AssetChoice = "original" | "shield";

interface DappWithdrawDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  positions: ShieldPositionWithPool[];
  pools: PoolSummary[];
  preSelectedTokenId?: bigint | null;
}

export function DappWithdrawDrawer({
  isOpen,
  onClose,
  positions,
  pools,
  preSelectedTokenId,
}: DappWithdrawDrawerProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [assetChoice, setAssetChoice] = useState<AssetChoice>("original");
  const [isPartial, setIsPartial] = useState(false);
  const [partialAmountInput, setPartialAmountInput] = useState("");
  const [slippageInput, setSlippageInput] = useState("0.5");

  const { withdrawFull, withdrawPartial, isWithdrawing, steps } = useWithdraw();

  // Reset state when drawer opens
  useEffect(() => {
    if (!isOpen) return;
    setAssetChoice("original");
    setIsPartial(false);
    setPartialAmountInput("");
    setSlippageInput("0.5");

    if (preSelectedTokenId != null) {
      const idx = positions.findIndex(p => p.tokenId === preSelectedTokenId);
      setSelectedIndex(idx >= 0 ? idx : 0);
    } else {
      setSelectedIndex(0);
    }
  }, [isOpen, preSelectedTokenId, positions]);

  const selected = positions[selectedIndex];
  if (!selected) {
    return (
      <Drawer isOpen={isOpen} onClose={onClose}>
        <div className="p-4 text-center text-font-grey">No positions to withdraw from.</div>
      </Drawer>
    );
  }

  const pool = pools.find(p => p.address.toLowerCase() === selected.poolAddress.toLowerCase());
  const shieldedToken = pool?.shieldedToken ?? (selected.poolAddress as Address);
  const backingToken = pool?.backingToken ?? (selected.poolAddress as Address);
  const decimals = selected.shieldedTokenDecimals;

  // Check 24h lock for shield activation
  const secondsSinceDeposit = Math.floor(Date.now() / 1000) - selected.depositTime;
  const canActivateShield = secondsSinceDeposit >= 86400;
  const hoursRemaining = Math.max(Math.ceil((86400 - secondsSinceDeposit) / 3600), 0);

  const preferredAsset: Address = assetChoice === "original" ? shieldedToken : backingToken;

  const handleWithdraw = async () => {
    const slippageBps = Math.round(parseFloat(slippageInput || "0.5") * 100);
    const slippageFactor = 10000n - BigInt(slippageBps);

    try {
      if (isPartial && partialAmountInput) {
        const amount = parseUnits(partialAmountInput, decimals);
        const minOut = (amount * slippageFactor) / 10000n;
        await withdrawPartial({
          poolAddress: selected.poolAddress as Address,
          tokenId: selected.tokenId,
          amount,
          preferredAsset,
          shieldedToken,
          backingToken,
          minAmountOut: minOut,
        });
      } else {
        const minOut = (selected.amount * slippageFactor) / 10000n;
        await withdrawFull({
          poolAddress: selected.poolAddress as Address,
          tokenId: selected.tokenId,
          preferredAsset,
          shieldedToken,
          backingToken,
          minAmountOut: minOut,
        });
      }
      onClose();
    } catch {
      // Error handled by useWithdraw via toast
    }
  };

  return (
    <Drawer isOpen={isOpen} onClose={onClose} isLocked={isWithdrawing}>
      {/* Header */}
      <div className="p-4 border-b border-base-300">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">Withdraw Funds</h3>
          <button onClick={onClose} disabled={isWithdrawing} className="btn btn-ghost btn-circle">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4">
        {/* Position selector */}
        {positions.length > 1 && (
          <div>
            <label className="legacy-input-label">Position</label>
            <select
              className="legacy-input"
              value={selectedIndex}
              onChange={e => setSelectedIndex(Number(e.target.value))}
            >
              {positions.map((pos, i) => (
                <option key={`${pos.poolAddress}-${pos.tokenId}`} value={i}>
                  #{String(pos.tokenId)} — {pos.shieldedTokenSymbol}/{pos.backingTokenSymbol} — {formatTokenAmount(pos.amount, pos.shieldedTokenDecimals)} {pos.shieldedTokenSymbol}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Withdrawal type */}
        <div>
          <label className="legacy-input-label">Withdrawal Type</label>
          <div className="flex gap-2">
            <button
              onClick={() => setIsPartial(false)}
              className={`btn btn-sm flex-1 ${!isPartial ? "btn-secondary" : "btn-outline"}`}
            >
              Full
            </button>
            <button
              onClick={() => setIsPartial(true)}
              className={`btn btn-sm flex-1 ${isPartial ? "btn-secondary" : "btn-outline"}`}
            >
              Partial
            </button>
          </div>
        </div>

        {/* Partial amount input */}
        {isPartial && (
          <div>
            <label className="legacy-input-label">Amount</label>
            <div className="relative">
              <input
                className="legacy-input pr-20"
                type="number"
                min="0"
                step="any"
                placeholder="0.00"
                value={partialAmountInput}
                onChange={e => setPartialAmountInput(e.target.value)}
              />
              <div className="absolute inset-y-0 right-2 flex items-center gap-1">
                <button
                  onClick={() => setPartialAmountInput(formatTokenAmount(selected.amount, decimals).replace(/,/g, ""))}
                  className="btn btn-xs btn-ghost text-secondary"
                >
                  Max
                </button>
                <span className="text-sm text-font-grey">{selected.shieldedTokenSymbol}</span>
              </div>
            </div>
          </div>
        )}

        {/* Asset choice */}
        <div>
          <label className="legacy-input-label">Receive As</label>
          <div className="space-y-2">
            <label
              className={`card bg-base-100 p-3 cursor-pointer transition-all ${
                assetChoice === "original" ? "ring-2 ring-secondary" : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name="assetChoice"
                  className="radio radio-secondary"
                  checked={assetChoice === "original"}
                  onChange={() => setAssetChoice("original")}
                />
                <div>
                  <p className="font-medium text-sm">Original Asset ({selected.shieldedTokenSymbol})</p>
                  <p className="text-xs text-font-grey">Receive the same token you deposited</p>
                </div>
              </div>
            </label>

            <label
              className={`card bg-base-100 p-3 cursor-pointer transition-all ${
                assetChoice === "shield" ? "ring-2 ring-warning" : ""
              } ${!canActivateShield ? "opacity-50" : ""}`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name="assetChoice"
                  className="radio radio-warning"
                  checked={assetChoice === "shield"}
                  onChange={() => setAssetChoice("shield")}
                  disabled={!canActivateShield}
                />
                <div>
                  <p className="font-medium text-sm">Activate Shield ({selected.backingTokenSymbol})</p>
                  {!canActivateShield ? (
                    <p className="text-xs text-warning">{hoursRemaining}h until shield activation available</p>
                  ) : (
                    <p className="text-xs text-font-grey">Receive the backing token at current oracle price</p>
                  )}
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Slippage */}
        <div>
          <label className="legacy-input-label">Slippage Tolerance</label>
          <div className="relative">
            <input
              className="legacy-input pr-10"
              type="number"
              min="0"
              max="50"
              step="0.1"
              value={slippageInput}
              onChange={e => setSlippageInput(e.target.value)}
            />
            <span className="pointer-events-none absolute inset-y-0 right-4 inline-flex items-center text-sm text-font-grey">%</span>
          </div>
        </div>

        {/* Summary */}
        <div className="card bg-base-100 p-3 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-font-grey">Position</span>
            <span>#{String(selected.tokenId)} — {selected.shieldedTokenSymbol}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-font-grey">Amount</span>
            <span>
              {isPartial && partialAmountInput
                ? `${partialAmountInput} ${selected.shieldedTokenSymbol}`
                : `${formatTokenAmount(selected.amount, decimals)} ${selected.shieldedTokenSymbol} (full)`}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-font-grey">Receive</span>
            <span>{assetChoice === "original" ? selected.shieldedTokenSymbol : selected.backingTokenSymbol}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-font-grey">Deposited</span>
            <span>{formatTimestamp(BigInt(selected.depositTime))}</span>
          </div>
        </div>

        {/* Transaction steps */}
        {isWithdrawing && <TransactionSteps steps={steps} />}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-base-300 bg-base-200">
        <button
          onClick={handleWithdraw}
          disabled={isWithdrawing || (isPartial && (!partialAmountInput || Number(partialAmountInput) <= 0))}
          className="btn btn-secondary w-full"
        >
          {isWithdrawing ? (
            <>
              <span className="loading loading-spinner loading-sm" />
              Withdrawing...
            </>
          ) : isPartial ? (
            "Withdraw Partial"
          ) : (
            "Withdraw Full"
          )}
        </button>
      </div>
    </Drawer>
  );
}
