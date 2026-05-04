import { useState, useEffect } from "react";
import { type Address, parseUnits } from "viem";
import { useAccount } from "wagmi";
import { Drawer } from "../../../components/Drawer";
import { TransactionSteps } from "../../../components/TransactionSteps";
import { useDeposit } from "../../../hooks/useDeposit";
import { useErc20Balance } from "../../../hooks/useErc20Balance";
import { useProtocolChain } from "../../../hooks/useProtocolChain";
import { formatTokenAmount } from "../../../protocol/format";
import type { PoolSummary } from "../../../protocol/pools";

const QUICK_ADD_AMOUNTS = [100, 500, 1000];

interface AddFundsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  pools: PoolSummary[];
  preSelectedPoolAddress?: string | null;
}

export function AddFundsDrawer({
  isOpen,
  onClose,
  pools,
  preSelectedPoolAddress,
}: AddFundsDrawerProps) {
  const { address: userAddress } = useAccount();
  const { activeProtocolChain } = useProtocolChain();
  const chainId = activeProtocolChain.id;

  const [selectedPoolAddress, setSelectedPoolAddress] = useState<string>("");
  const [amountInput, setAmountInput] = useState("");
  const [useCustomAmount, setUseCustomAmount] = useState(false);
  const [quickAddSelected, setQuickAddSelected] = useState<number | null>(null);

  const { depositShielded, isDepositing, steps } = useDeposit();

  const selectedPool = pools.find(p => p.address === selectedPoolAddress) ?? pools[0];

  const { balance, isLoading: isLoadingBalance } = useErc20Balance({
    tokenAddress: selectedPool?.shieldedToken,
    accountAddress: userAddress,
    chainId,
  });

  // Reset state when drawer opens
  useEffect(() => {
    if (isOpen) {
      setSelectedPoolAddress(preSelectedPoolAddress ?? pools[0]?.address ?? "");
      setAmountInput("");
      setUseCustomAmount(false);
      setQuickAddSelected(null);
    }
  }, [isOpen, preSelectedPoolAddress, pools]);

  const handleQuickAdd = (usdAmount: number) => {
    setQuickAddSelected(usdAmount);
    setUseCustomAmount(false);
    // Quick-add values are illustrative USD amounts; convert to token amount
    // For simplicity, use 1:1 as placeholder (user refines with custom amount)
    setAmountInput(usdAmount.toString());
  };

  const handleMaxClick = () => {
    if (!balance || !selectedPool) return;
    setQuickAddSelected(null);
    setUseCustomAmount(true);
    setAmountInput(formatTokenAmount(balance, selectedPool.shieldedTokenDecimals).replace(/,/g, ""));
  };

  const handleDeposit = async () => {
    if (!selectedPool || !amountInput || !userAddress) return;

    try {
      const amount = parseUnits(amountInput, selectedPool.shieldedTokenDecimals);
      await depositShielded({
        poolAddress: selectedPool.address as Address,
        asset: selectedPool.shieldedToken,
        shieldedToken: selectedPool.shieldedToken,
        backingToken: selectedPool.backingToken,
        amount,
        minReceived: (amount * 99n) / 100n,
      });
      onClose();
    } catch {
      // Error handled by useDeposit via toast
    }
  };

  if (!selectedPool) return null;

  return (
    <Drawer isOpen={isOpen} onClose={onClose} isLocked={isDepositing}>
      {/* Header */}
      <div className="p-4 border-b border-base-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
              style={{ background: "var(--ys-gradient-brand)" }}
            >
              {selectedPool.shieldedTokenSymbol.slice(0, 2)}
            </div>
            <div>
              <h3 className="text-lg font-bold">Add to {selectedPool.shieldedTokenSymbol} / {selectedPool.backingTokenSymbol}</h3>
              <p className="text-xs text-font-grey">
                {((Number(selectedPool.commissionRate + selectedPool.poolFee) / 10000) * 100).toFixed(2)}% fee
              </p>
            </div>
          </div>
          <button onClick={onClose} disabled={isDepositing} className="btn btn-ghost btn-circle">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4">
        {/* Pool selector (only if multiple) */}
        {pools.length > 1 && (
          <div>
            <label className="legacy-input-label">Pool</label>
            <select
              className="legacy-input"
              value={selectedPoolAddress}
              onChange={e => setSelectedPoolAddress(e.target.value)}
            >
              {pools.map(pool => (
                <option key={pool.address} value={pool.address}>
                  {pool.shieldedTokenSymbol} / {pool.backingTokenSymbol} — {((Number(pool.commissionRate + pool.poolFee) / 10000) * 100).toFixed(2)}% fee
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Quick-add buttons */}
        <div>
          <label className="legacy-input-label">Amount</label>
          <div className="flex gap-2 flex-wrap">
            {QUICK_ADD_AMOUNTS.map(amount => (
              <button
                key={amount}
                onClick={() => handleQuickAdd(amount)}
                className={`btn btn-sm ${quickAddSelected === amount ? "btn-secondary" : "btn-outline"}`}
              >
                ${amount}
              </button>
            ))}
            <button onClick={handleMaxClick} className={`btn btn-sm ${quickAddSelected === null && !useCustomAmount ? "" : "btn-outline"}`}>
              Max
            </button>
          </div>
        </div>

        {/* Custom amount toggle + input */}
        <div>
          {!useCustomAmount && (
            <button
              onClick={() => {
                setUseCustomAmount(true);
                setQuickAddSelected(null);
              }}
              className="text-sm text-link cursor-pointer"
            >
              Enter custom amount
            </button>
          )}
          {useCustomAmount && (
            <div className="relative">
              <input
                className="legacy-input pr-20"
                type="number"
                min="0"
                step="any"
                placeholder="0.00"
                value={amountInput}
                onChange={e => {
                  setAmountInput(e.target.value);
                  setQuickAddSelected(null);
                }}
                autoFocus
              />
              <span className="pointer-events-none absolute inset-y-0 right-4 inline-flex items-center text-sm text-font-grey">
                {selectedPool.shieldedTokenSymbol}
              </span>
            </div>
          )}
        </div>

        {/* Wallet balance */}
        <div className="text-sm text-font-grey">
          {isLoadingBalance ? (
            <span>Loading balance...</span>
          ) : balance !== undefined ? (
            <span>
              Balance: {formatTokenAmount(balance, selectedPool.shieldedTokenDecimals)} {selectedPool.shieldedTokenSymbol}
            </span>
          ) : (
            <span>Connect wallet to see balance</span>
          )}
        </div>

        {/* Shield protection info */}
        <div className="bg-success/10 border border-success/30 rounded-xl p-3">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "var(--ys-success)" }} viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3z" />
            </svg>
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--ys-success)" }}>Shield Protected</p>
              <p className="text-xs text-font-grey mt-1">
                Your deposit is protected by on-chain balance shields. No exclusions, no delays.
              </p>
            </div>
          </div>
        </div>

        {/* Transaction steps */}
        {isDepositing && <TransactionSteps steps={steps} />}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-base-300 bg-base-200">
        <button
          onClick={handleDeposit}
          disabled={isDepositing || !amountInput || Number(amountInput) <= 0}
          className="btn btn-secondary w-full"
        >
          {isDepositing ? (
            <>
              <span className="loading loading-spinner loading-sm" />
              Depositing...
            </>
          ) : (
            "Deposit"
          )}
        </button>
      </div>
    </Drawer>
  );
}
