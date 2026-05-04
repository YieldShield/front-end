import { useState } from "react";
import { type Address, parseUnits } from "viem";
import { useAccount } from "wagmi";
import { Drawer } from "../../../components/Drawer";
import { TransactionSteps } from "../../../components/TransactionSteps";
import { useDeposit } from "../../../hooks/useDeposit";
import { useErc20Balance } from "../../../hooks/useErc20Balance";
import { useProtocolChain } from "../../../hooks/useProtocolChain";
import { formatBps, formatTokenAmount } from "../../../protocol/format";
import type { PoolSummary } from "../../../protocol/pools";

type DepositDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  pool: PoolSummary;
};

type DepositRole = "shield" | "protect";

export function DepositDrawer({ isOpen, onClose, pool }: DepositDrawerProps) {
  const { address } = useAccount();
  const { activeProtocolChain } = useProtocolChain();
  const chainId = activeProtocolChain.id;

  const [role, setRole] = useState<DepositRole>("shield");
  const [amountInput, setAmountInput] = useState("");

  const isShield = role === "shield";
  const tokenAddress = isShield ? pool.shieldedToken : pool.backingToken;
  const tokenSymbol = isShield ? pool.shieldedTokenSymbol : pool.backingTokenSymbol;
  const tokenDecimals = isShield ? pool.shieldedTokenDecimals : pool.backingTokenDecimals;

  const { balance, isLoading: isLoadingBalance } = useErc20Balance({
    tokenAddress,
    accountAddress: address,
    chainId,
  });

  const { depositShielded, depositBacking, isDepositing, steps } = useDeposit();

  const parsedAmount = (() => {
    try {
      return amountInput ? parseUnits(amountInput, tokenDecimals) : 0n;
    } catch {
      return 0n;
    }
  })();

  const hasInsufficientBalance = balance !== undefined && parsedAmount > balance;
  const isValidAmount = parsedAmount > 0n && !hasInsufficientBalance;

  const totalFeeBps = pool.commissionRate + pool.poolFee;
  const [showFeeDetails, setShowFeeDetails] = useState(false);

  async function handleDeposit() {
    if (!isValidAmount) return;

    const params = {
      poolAddress: pool.address,
      asset: tokenAddress,
      shieldedToken: pool.shieldedToken,
      backingToken: pool.backingToken,
      amount: parsedAmount,
      minReceived: (parsedAmount * 99n) / 100n, // 1% slippage tolerance — covers pool fees + minor oracle drift
    };

    try {
      if (isShield) {
        await depositShielded(params);
      } else {
        await depositBacking(params);
      }
      setAmountInput("");
      onClose();
    } catch {
      // Error already handled by hook toast
    }
  }

  function handleMax() {
    if (balance !== undefined) {
      setAmountInput(formatTokenAmount(balance, tokenDecimals).replace(/,/g, ""));
    }
  }

  return (
    <Drawer isOpen={isOpen} onClose={onClose} isLocked={isDepositing}>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Deposit</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose} disabled={isDepositing}>
            &#10005;
          </button>
        </div>

        <div className="text-sm text-base-content/60">
          {pool.shieldedTokenSymbol} / {pool.backingTokenSymbol}
        </div>

        {/* Role toggle */}
        <div className="flex gap-2">
          <button
            className={`btn btn-sm flex-1 ${isShield ? "btn-primary" : "btn-outline"}`}
            onClick={() => setRole("shield")}
            disabled={isDepositing}
          >
            Shield
          </button>
          <button
            className={`btn btn-sm flex-1 ${!isShield ? "btn-primary" : "btn-outline"}`}
            onClick={() => setRole("protect")}
            disabled={isDepositing}
          >
            Protect
          </button>
        </div>

        {/* Amount input */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Amount ({tokenSymbol})</label>
          <div className="flex gap-2">
            <input
              type="text"
              inputMode="decimal"
              className="input input-bordered flex-1"
              placeholder="0.0"
              value={amountInput}
              onChange={e => setAmountInput(e.target.value)}
              disabled={isDepositing}
            />
            <button className="btn btn-outline btn-sm self-center" onClick={handleMax} disabled={isDepositing}>
              Max
            </button>
          </div>
          <div className="text-xs text-base-content/50">
            Balance:{" "}
            {isLoadingBalance ? "..." : balance !== undefined ? formatTokenAmount(balance, tokenDecimals) : "—"}{" "}
            {tokenSymbol}
          </div>
          {hasInsufficientBalance && <div className="text-xs text-error">Insufficient balance</div>}
        </div>

        {/* Fee summary */}
        <div className="space-y-1">
          <button
            className="flex items-center justify-between w-full text-sm"
            onClick={() => setShowFeeDetails(prev => !prev)}
          >
            <span>Total fee</span>
            <span className="font-medium">{formatBps(totalFeeBps)} {showFeeDetails ? "▲" : "▼"}</span>
          </button>
          {showFeeDetails && (
            <div className="text-xs text-base-content/50 space-y-0.5 pl-2">
              <div>Commission (protectors): {formatBps(pool.commissionRate)}</div>
              <div>Pool fee (creator): {formatBps(pool.poolFee)}</div>
            </div>
          )}
        </div>

        {/* Transaction steps */}
        {isDepositing && (
          <div className="card bg-base-100 p-4">
            <TransactionSteps steps={steps} />
          </div>
        )}

        {/* Deposit button */}
        <button
          className="btn btn-primary w-full"
          onClick={handleDeposit}
          disabled={!isValidAmount || isDepositing || !address}
        >
          {isDepositing ? "Depositing..." : !address ? "Connect Wallet" : `Deposit ${tokenSymbol}`}
        </button>
      </div>
    </Drawer>
  );
}
