import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { type Address, isAddress } from "viem";
import { useAccount } from "wagmi";
import toast from "react-hot-toast";
import { InfoTooltip } from "../../components/InfoTooltip";
import { PoolHealthDot } from "../../components/PoolHealthDot";
import { TokenPairMark } from "../../components/TokenPairMark";
import { useProtocolChain } from "../../hooks/useProtocolChain";
import { useUserPositions } from "../../hooks/useUserPositions";
import { formatAddress, formatBps, formatTokenAmount } from "../../protocol/format";
import { fetchPoolDetail } from "../../protocol/pools";
import { ClaimDrawer } from "./components/ClaimDrawer";
import { DepositDrawer } from "./components/DepositDrawer";
import { ProtectorManageDrawer } from "./components/ProtectorManageDrawer";
import { WithdrawDrawer } from "./components/WithdrawDrawer";

function AddressCopy({ address, label, badge }: { address: string; label: string; badge?: string }) {
  return (
    <div>
      <div className="text-sm text-font-grey mb-2">{label}</div>
      <div className="flex items-center gap-2">
        <span className="font-mono text-sm">{formatAddress(address)}</span>
        <button
          className="btn btn-ghost btn-xs"
          onClick={() => {
            navigator.clipboard.writeText(address);
            toast.success("Copied!");
          }}
        >
          Copy
        </button>
      </div>
      {badge && <div className="badge badge-outline mt-1 text-xs">{badge}</div>}
    </div>
  );
}

export function PoolDetailPage() {
  const { address } = useParams();
  const { activeProtocolChain } = useProtocolChain();
  const { isConnected, address: userAddress } = useAccount();
  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showClaim, setShowClaim] = useState(false);
  const [showProtectorManage, setShowProtectorManage] = useState(false);

  const normalizedAddress = useMemo(() => {
    if (!address || !isAddress(address)) return null;
    return address;
  }, [address]);

  const { data, error, isLoading } = useQuery({
    queryKey: ["pool-detail", activeProtocolChain.id, normalizedAddress],
    queryFn: () => fetchPoolDetail(activeProtocolChain.id, normalizedAddress!),
    enabled: !!normalizedAddress,
  });

  const { positions } = useUserPositions(userAddress);
  const poolShieldPositions = positions?.shieldPositions.filter(
    p => p.poolAddress.toLowerCase() === normalizedAddress?.toLowerCase(),
  ) ?? [];
  const poolProtectorPositions = positions?.protectorPositions.filter(
    p => p.poolAddress.toLowerCase() === normalizedAddress?.toLowerCase(),
  ) ?? [];

  const activeShieldPositions = poolShieldPositions.filter(p => !p.isWithdrawn);
  const hasActiveShield = activeShieldPositions.length > 0;
  const hasPositions = poolShieldPositions.length > 0 || poolProtectorPositions.length > 0;

  // Position aggregates
  const totalShieldAmount = activeShieldPositions.reduce((sum, p) => sum + p.amount, 0n);
  const totalProtectorAmount = poolProtectorPositions.reduce((sum, p) => sum + p.amount, 0n);

  // Utilization: (shieldedBalance * collateralRatio) / (backingBalance * 10000)
  const utilPercent = useMemo(() => {
    if (!data || data.backingBalance === 0n) return 0;
    const required = Number(data.shieldedBalance) * Number(data.collateralRatio);
    const available = Number(data.backingBalance) * 10000;
    if (available === 0) return 0;
    return Math.min((required / available) * 100, 100);
  }, [data]);

  // Error / loading states
  if (!normalizedAddress) {
    return (
      <div className="card bg-base-200">
        <div className="card-body text-center py-12">
          <strong className="text-error">Invalid pool address</strong>
          <p className="text-font-grey mt-2">The current route does not contain a valid EVM address.</p>
          <Link to="/dashboard" className="btn btn-secondary btn-sm mt-4 mx-auto">Back to pools</Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="text-center">
          <div className="loading loading-spinner loading-lg text-secondary mb-4" />
          <p className="text-font-grey">Loading pool data...</p>
        </div>
      </div>
    );
  }

  if (error instanceof Error) {
    return (
      <div className="card bg-base-200">
        <div className="card-body">
          <strong className="text-error">Could not load pool detail</strong>
          <p className="text-font-grey mt-2">{error.message}</p>
          <Link to="/dashboard" className="btn btn-secondary btn-sm mt-4 w-fit">Back to pools</Link>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <>
      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
        {/* LEFT CARD — Pool Analytics */}
        <div className="card bg-base-200 w-full">
          <div className="card-body p-4 sm:p-6">
            {/* Pool Header */}
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  {data.shieldedTokenSymbol} / {data.backingTokenSymbol} Pool
                  <PoolHealthDot
                    shieldedBalance={data.shieldedBalance}
                    backingBalance={data.backingBalance}
                    collateralRatio={data.collateralRatio}
                    shieldedTokenDecimals={data.shieldedTokenDecimals}
                    backingTokenDecimals={data.backingTokenDecimals}
                  />
                </h2>
                <Link to="/dashboard" className="text-link text-sm">Back to pools</Link>
              </div>
              <div className="mt-2 flex items-center gap-3">
                <TokenPairMark shieldedSymbol={data.shieldedTokenSymbol} backingSymbol={data.backingTokenSymbol} />
                <span className="text-sm text-font-grey">Creator: {formatAddress(data.creator)}</span>
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-base-100 rounded-lg p-4">
                <div className="text-sm text-font-grey mb-1">Shielded Balance</div>
                <div className="text-xl font-bold">
                  {formatTokenAmount(data.shieldedBalance, data.shieldedTokenDecimals)} {data.shieldedTokenSymbol}
                </div>
              </div>
              <div className="bg-base-100 rounded-lg p-4">
                <div className="text-sm text-font-grey mb-1">Backing Balance</div>
                <div className="text-xl font-bold">
                  {formatTokenAmount(data.backingBalance, data.backingTokenDecimals)} {data.backingTokenSymbol}
                </div>
              </div>
              <div className="bg-base-100 rounded-lg p-4">
                <div className="text-sm text-font-grey mb-1">Total Fees</div>
                <div className="text-xl font-bold">{formatBps(data.commissionRate + data.poolFee)}</div>
              </div>
            </div>

            {/* Pool Utilization */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold text-base m-0">Pool Utilization</h3>
                <InfoTooltip tip="Percentage of protector capital locked by shielded deposits" />
              </div>
              <div className="bg-base-100 p-3 rounded-lg">
                <div className="flex items-center justify-end mb-4">
                  <div className="text-xl font-bold">{utilPercent.toFixed(2)}%</div>
                </div>
                <div className="w-full bg-base-300 rounded-full h-3">
                  <div
                    className="bg-primary h-3 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(utilPercent, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-font-grey mt-2">
                  <span>0%</span>
                  <span>100%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT CARD — Interact with Pool */}
        <div className="card bg-base-200 w-full">
          <div className="card-body p-4 sm:p-6">
            <h2 className="text-xl font-bold mb-4">Interact with Pool</h2>

            {/* User Positions Summary */}
            {isConnected && hasPositions && (
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-base-100 rounded-lg p-3">
                  <div className="text-sm text-font-grey">Shield Positions</div>
                  <div className="text-lg font-bold">{activeShieldPositions.length}</div>
                  {totalShieldAmount > 0n && (
                    <div className="text-xs text-font-grey">
                      {formatTokenAmount(totalShieldAmount, data.shieldedTokenDecimals)} {data.shieldedTokenSymbol}
                    </div>
                  )}
                </div>
                <div className="bg-base-100 rounded-lg p-3">
                  <div className="text-sm text-font-grey">Protector Positions</div>
                  <div className="text-lg font-bold">{poolProtectorPositions.length}</div>
                  {totalProtectorAmount > 0n && (
                    <div className="text-xs text-font-grey">
                      {formatTokenAmount(totalProtectorAmount, data.backingTokenDecimals)} {data.backingTokenSymbol}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                className="btn btn-secondary w-full"
                onClick={() => setShowDeposit(true)}
                disabled={!isConnected}
              >
                {isConnected ? "Deposit Shielded Asset" : "Connect Wallet to Deposit"}
              </button>
              {hasActiveShield && (
                <button className="btn btn-outline w-full" onClick={() => setShowWithdraw(true)}>
                  Withdraw
                </button>
              )}
              {hasPositions && (
                <button className="btn btn-outline w-full" onClick={() => setShowClaim(true)}>
                  Claim Fees
                </button>
              )}
              {poolProtectorPositions.length > 0 && (
                <button className="btn btn-outline w-full" onClick={() => setShowProtectorManage(true)}>
                  Manage Protector
                </button>
              )}
              {!isConnected && (
                <p className="text-sm text-font-grey text-center mt-2">Connect your wallet to interact with this pool.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM — Pool Information */}
      <div className="mt-8">
        <div className="card bg-base-200">
          <div className="card-body">
            <h2 className="text-xl font-bold mb-4">Pool Information</h2>

            {/* 4-column address grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <AddressCopy address={data.address} label="Pool Address" />
              <AddressCopy address={data.shieldedToken} label="Shielded Token" badge={data.shieldedTokenSymbol} />
              <AddressCopy address={data.backingToken} label="Backing Token" badge={data.backingTokenSymbol} />
              <AddressCopy address={data.creator} label="Pool Creator" />
            </div>

            {/* Fee grid */}
            <div className="border-t border-base-300 pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-base-100 rounded-lg p-4">
                  <div className="text-sm text-font-grey mb-1">Commission Rate</div>
                  <div className="text-xl font-semibold">{formatBps(data.commissionRate)}</div>
                </div>
                <div className="bg-base-100 rounded-lg p-4">
                  <div className="text-sm text-font-grey mb-1">Pool Creator Fee</div>
                  <div className="text-xl font-semibold">{formatBps(data.poolFee)}</div>
                </div>
                <div className="bg-base-100 rounded-lg p-4">
                  <div className="text-sm text-font-grey mb-1">Total Fees</div>
                  <div className="text-xl font-semibold">{formatBps(data.commissionRate + data.poolFee)}</div>
                </div>
                <div className="bg-base-100 rounded-lg p-4">
                  <div className="text-sm text-font-grey mb-1">Collateral Ratio</div>
                  <div className="text-xl font-semibold">{formatBps(data.collateralRatio)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Drawers */}
      <DepositDrawer isOpen={showDeposit} onClose={() => setShowDeposit(false)} pool={data} />
      <WithdrawDrawer
        isOpen={showWithdraw}
        onClose={() => setShowWithdraw(false)}
        pool={data}
        positions={poolShieldPositions}
      />
      <ClaimDrawer
        isOpen={showClaim}
        onClose={() => setShowClaim(false)}
        pool={data}
        shieldPositions={poolShieldPositions}
        protectorPositions={poolProtectorPositions}
      />
      <ProtectorManageDrawer
        isOpen={showProtectorManage}
        onClose={() => setShowProtectorManage(false)}
        pool={data}
        positions={poolProtectorPositions}
      />
    </>
  );
}
