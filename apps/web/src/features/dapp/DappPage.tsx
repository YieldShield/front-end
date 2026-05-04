import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { type Address, parseUnits } from "viem";
import { useAccount } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useProtocolChain } from "../../hooks/useProtocolChain";
import { useUserPositions } from "../../hooks/useUserPositions";
import { useMultiPoolAggregation } from "../../hooks/useMultiPoolAggregation";
import { useDeposit } from "../../hooks/useDeposit";
import { fetchPoolsForChain } from "../../protocol/pools";
import { SavingsBalanceCard } from "./components/SavingsBalanceCard";
import { PoolsSummaryList } from "./components/PoolsSummaryList";
import { ProjectionSimulatorCard } from "./components/ProjectionSimulatorCard";
import { AddFundsDrawer } from "./components/AddFundsDrawer";
import { DappWithdrawDrawer } from "./components/DappWithdrawDrawer";
import { NFTPositionsDrawer } from "./components/NFTPositionsDrawer";
import { PoolDetailDrawer } from "./components/PoolDetailDrawer";
import { ShieldDetailDrawer } from "./components/ShieldDetailDrawer";

export function DappPage() {
  const { activeProtocolChain } = useProtocolChain();
  const { address: userAddress, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const queryClient = useQueryClient();
  const [selectedPoolAddress, setSelectedPoolAddress] = useState<string | null>(null);

  // Drawer visibility
  const [showAddFunds, setShowAddFunds] = useState(false);
  const [addFundsPreSelectedPool, setAddFundsPreSelectedPool] = useState<string | null>(null);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [preSelectedTokenId, setPreSelectedTokenId] = useState<bigint | null>(null);
  const [showNFTDrawer, setShowNFTDrawer] = useState(false);
  const [showPoolDetail, setShowPoolDetail] = useState(false);
  const [selectedPoolForDetail, setSelectedPoolForDetail] = useState<string | null>(null);
  const [showShieldDetail, setShowShieldDetail] = useState(false);

  // Data
  const { data: pools, error, isLoading: isLoadingPools } = useQuery({
    queryKey: ["dapp-pools", activeProtocolChain.id],
    queryFn: () => fetchPoolsForChain(activeProtocolChain.id),
  });

  const { positions, isLoading: isLoadingPositions } = useUserPositions(userAddress);

  const {
    poolGroups,
    globalAggregated,
    hasDeposits,
    allPositionsWithPool,
    isLoading: isAggregationLoading,
  } = useMultiPoolAggregation(positions, pools ?? []);

  const { depositShielded, isDepositing } = useDeposit();

  // Default pool selection
  const lowestCommissionPool = useMemo(() => {
    if (!pools?.length) return null;
    return pools.reduce((best, c) =>
      c.commissionRate < best.commissionRate ||
      (c.commissionRate === best.commissionRate && c.poolFee < best.poolFee)
        ? c : best,
    );
  }, [pools]);

  useEffect(() => {
    if (!pools?.length) {
      setSelectedPoolAddress(null);
      return;
    }
    const stillPresent = pools.some(p => p.address === selectedPoolAddress);
    if (!selectedPoolAddress || !stillPresent) {
      setSelectedPoolAddress(lowestCommissionPool?.address ?? pools[0].address);
    }
  }, [pools, lowestCommissionPool, selectedPoolAddress]);

  // Derived
  const isDataLoading = isLoadingPools || (isConnected && (isLoadingPositions || isAggregationLoading));

  // Earnings estimate (from valueAtDeposit aggregation)
  const totalEarned = 0; // valueAtDeposit is a snapshot, not live; earned = 0 until we have APY

  // Selected pool group for detail drawer
  const selectedPoolGroup = poolGroups.find(
    g => g.poolAddress.toLowerCase() === selectedPoolForDetail?.toLowerCase(),
  ) ?? null;

  // --- Handlers ---
  const handleAddFundsClick = () => {
    const highestValuePool = poolGroups[0]?.poolAddress ?? pools?.[0]?.address ?? null;
    setAddFundsPreSelectedPool(highestValuePool);
    setShowAddFunds(true);
  };

  const handleWithdrawClick = () => {
    setPreSelectedTokenId(null);
    setShowWithdraw(true);
  };

  const handlePoolClick = (poolAddress: string) => {
    setSelectedPoolForDetail(poolAddress);
    setShowPoolDetail(true);
  };

  const handleShieldBadgeClick = () => {
    if (hasDeposits) {
      setShowNFTDrawer(true);
    } else {
      setShowShieldDetail(true);
    }
  };

  const handlePoolWithdrawPosition = (_poolAddress: string, tokenId: bigint) => {
    setShowPoolDetail(false);
    setPreSelectedTokenId(tokenId);
    setShowWithdraw(true);
  };

  const handleNFTWithdraw = (tokenId: bigint) => {
    setShowNFTDrawer(false);
    setPreSelectedTokenId(tokenId);
    setShowWithdraw(true);
  };

  const handleSimulatorDeposit = async (poolAddress: string, amount: number) => {
    const pool = pools?.find(p => p.address === poolAddress);
    if (!pool) return;

    try {
      const amountBigint = parseUnits(amount.toString(), pool.shieldedTokenDecimals);
      await depositShielded({
        poolAddress: pool.address as Address,
        asset: pool.shieldedToken,
        shieldedToken: pool.shieldedToken,
        backingToken: pool.backingToken,
        amount: amountBigint,
        minReceived: (amountBigint * 99n) / 100n,
      });
      await queryClient.invalidateQueries({ queryKey: ["dapp-pools"] });
    } catch {
      // Error handled by useDeposit via toast
    }
  };

  return (
    <div className="min-h-screen bg-base-100">
      <div className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-4xl space-y-6">
          {isLoadingPools ? (
            <div className="min-h-[50vh] flex items-center justify-center">
              <div className="text-center">
                <div className="loading loading-spinner loading-lg text-secondary mb-4" />
                <p className="text-font-grey">Finding best savings rate...</p>
              </div>
            </div>
          ) : error instanceof Error ? (
            <div className="alert alert-error">
              <div>
                <p className="font-medium">Unable to load shield pools</p>
                <p className="mt-1 text-sm">{error.message}</p>
              </div>
            </div>
          ) : !pools?.length ? (
            <div className="max-w-xl mx-auto text-center py-16">
              <h1 className="text-3xl font-bold mb-4">No Savings Pools Available</h1>
              <p className="text-font-grey mb-8">
                There are currently no readable savings pools on this deployment. Check back later or browse the
                governance and points areas while the factory is being seeded.
              </p>
              <Link to="/dashboard" className="btn btn-secondary">View Dashboard</Link>
            </div>
          ) : isDataLoading ? (
            <div className="min-h-[30vh] flex items-center justify-center">
              <div className="text-center">
                <div className="loading loading-spinner loading-lg text-secondary mb-4" />
                <p className="text-font-grey">Loading your positions...</p>
              </div>
            </div>
          ) : hasDeposits ? (
            <>
              <SavingsBalanceCard
                balance={globalAggregated.totalValueUsd}
                totalEarned={totalEarned}
                positionCount={globalAggregated.positionCount}
                poolCount={globalAggregated.poolCount}
                isConnected={isConnected}
                onAddFundsClick={handleAddFundsClick}
                onWithdrawClick={handleWithdrawClick}
                onShieldedBadgeClick={handleShieldBadgeClick}
                onConnectClick={openConnectModal}
              />
              <PoolsSummaryList
                poolGroups={poolGroups}
                onPoolClick={handlePoolClick}
              />
            </>
          ) : (
            <ProjectionSimulatorCard
              pools={pools}
              selectedPoolAddress={selectedPoolAddress}
              onSelectPool={setSelectedPoolAddress}
              onConfirmDeposit={handleSimulatorDeposit}
              isDepositing={isDepositing}
              isConnected={isConnected}
              onConnectClick={openConnectModal}
              onShieldedBadgeClick={handleShieldBadgeClick}
            />
          )}

          {/* Drawers (always rendered) */}
          <AddFundsDrawer
            isOpen={showAddFunds}
            onClose={() => setShowAddFunds(false)}
            pools={pools ?? []}
            preSelectedPoolAddress={addFundsPreSelectedPool}
          />
          <DappWithdrawDrawer
            isOpen={showWithdraw}
            onClose={() => setShowWithdraw(false)}
            positions={allPositionsWithPool}
            pools={pools ?? []}
            preSelectedTokenId={preSelectedTokenId}
          />
          <NFTPositionsDrawer
            isOpen={showNFTDrawer}
            onClose={() => setShowNFTDrawer(false)}
            positions={allPositionsWithPool}
            onWithdraw={handleNFTWithdraw}
          />
          <PoolDetailDrawer
            isOpen={showPoolDetail}
            onClose={() => setShowPoolDetail(false)}
            group={selectedPoolGroup}
            onWithdrawPosition={handlePoolWithdrawPosition}
          />
          <ShieldDetailDrawer
            isOpen={showShieldDetail}
            onClose={() => setShowShieldDetail(false)}
          />
        </div>
      </div>
    </div>
  );
}
