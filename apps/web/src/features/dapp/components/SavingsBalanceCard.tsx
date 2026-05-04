import { useEffect, useRef, useState } from "react";
import { formatUsdDisplay } from "../../../protocol/format";

interface SavingsBalanceCardProps {
  balance: number;
  totalEarned: number;
  positionCount: number;
  poolCount: number;
  isLoading?: boolean;
  onShieldedBadgeClick?: () => void;
  onAddFundsClick?: () => void;
  onWithdrawClick?: () => void;
  isConnected?: boolean;
  onConnectClick?: () => void;
}

export function SavingsBalanceCard({
  balance,
  totalEarned,
  isLoading = false,
  onShieldedBadgeClick,
  onAddFundsClick,
  onWithdrawClick,
  isConnected,
  onConnectClick,
}: SavingsBalanceCardProps) {
  const [displayBalance, setDisplayBalance] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const animationRef = useRef<number | null>(null);

  // Count-up animation on initial load
  useEffect(() => {
    if (isLoading || hasAnimated || balance === 0) {
      if (balance === 0 && !isLoading) setDisplayBalance(0);
      return;
    }

    const duration = 1500;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);

      setDisplayBalance(balance * easeOut);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setHasAnimated(true);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [balance, isLoading, hasAnimated]);

  // Sync after animation completes
  useEffect(() => {
    if (hasAnimated) setDisplayBalance(balance);
  }, [balance, hasAnimated]);

  return (
    <div className="card bg-base-200">
      <div className="card-body p-4 md:p-6">
        {/* Header: blob + shield badge */}
        <div className="flex items-center justify-between mb-6">
          <div
            className="blob-subtle w-10 h-10"
            style={{ backgroundColor: "var(--ys-brand-secondary)" }}
          />

          <button
            onClick={onShieldedBadgeClick}
            className="flex items-center justify-center w-9 h-9 rounded-full transition-all duration-200 hover:scale-105 cursor-pointer"
            style={{
              backgroundColor: "var(--ys-success-bg-strong)",
              color: "var(--ys-success)",
              border: "1px solid var(--ys-success-border)",
            }}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3z" />
            </svg>
          </button>
        </div>

        {/* Balance hero */}
        <div className="relative bg-base-100 rounded-xl p-6 mb-4">
          <div className="absolute inset-0 overflow-hidden rounded-xl">
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full opacity-10"
              style={{ backgroundColor: "var(--ys-brand-secondary)", filter: "blur(60px)" }}
            />
          </div>

          <div className="relative z-10 text-center">
            {isLoading ? (
              <>
                <div className="h-4 w-20 mx-auto bg-base-300 rounded animate-pulse mb-2" />
                <div className="h-12 w-48 mx-auto bg-base-300 rounded animate-pulse mb-3" />
              </>
            ) : (
              <>
                <p className="text-sm text-font-grey uppercase tracking-wide mb-2">
                  Current Balance
                </p>
                <p
                  className="text-4xl md:text-5xl font-bold mb-3"
                  style={{ color: "var(--ys-brand-secondary)" }}
                >
                  {formatUsdDisplay(displayBalance)}
                </p>
                {totalEarned > 0 && (
                  <p className="text-base-content/70 mt-1">
                    <span className="font-semibold text-success">
                      +{formatUsdDisplay(totalEarned)}
                    </span>{" "}
                    earned
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        {/* Action buttons */}
        {!isLoading &&
          (isConnected ? (
            <div className="flex justify-center gap-8">
              <div className="flex flex-col items-center gap-1.5">
                <button
                  onClick={onAddFundsClick}
                  aria-label="Add Funds"
                  className="btn btn-secondary btn-circle w-14 h-14"
                >
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 4v16m8-8H4" />
                  </svg>
                </button>
                <span className="text-xs font-medium text-base-content/70">Add Funds</span>
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <button
                  onClick={onWithdrawClick}
                  aria-label="Withdraw"
                  className="btn btn-outline btn-circle w-14 h-14"
                >
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
                  </svg>
                </button>
                <span className="text-xs font-medium text-base-content/70">Withdraw</span>
              </div>
            </div>
          ) : onConnectClick ? (
            <div className="text-center py-2">
              <button onClick={onConnectClick} className="btn btn-secondary btn-lg">
                Connect Wallet
              </button>
            </div>
          ) : null)}
      </div>
    </div>
  );
}
