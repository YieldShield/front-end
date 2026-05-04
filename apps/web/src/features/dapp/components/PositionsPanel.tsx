import { Link } from "react-router-dom";
import { type Address } from "viem";
import { useUserPositions } from "../../../hooks/useUserPositions";
import { useProtocolChain } from "../../../hooks/useProtocolChain";
import { useQuery } from "@tanstack/react-query";
import { fetchPoolsForChain } from "../../../protocol/pools";
import { ShieldPositionCard, ProtectorPositionCard } from "./PositionCard";

type PositionsPanelProps = {
  userAddress: Address;
};

export function PositionsPanel({ userAddress }: PositionsPanelProps) {
  const { activeProtocolChain } = useProtocolChain();
  const { positions, isLoading, error } = useUserPositions(userAddress);

  const { data: pools } = useQuery({
    queryKey: ["dapp-pools", activeProtocolChain.id],
    queryFn: () => fetchPoolsForChain(activeProtocolChain.id),
  });

  if (isLoading) {
    return (
      <div className="card bg-base-200">
        <div className="card-body text-center">
          <div className="loading loading-spinner loading-md text-secondary mx-auto" />
          <p className="text-sm text-base-content/50">Scanning positions across pools...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-warning">
        <p className="text-sm">Could not load positions: {error.message}</p>
      </div>
    );
  }

  const shieldPositions = positions?.shieldPositions ?? [];
  const protectorPositions = positions?.protectorPositions ?? [];
  const totalPositions = shieldPositions.length + protectorPositions.length;

  if (totalPositions === 0) {
    return (
      <div className="card bg-base-200">
        <div className="card-body text-center py-8">
          <p className="text-base-content/60">No positions yet. Deposit into a pool to get started.</p>
          <Link to="/dashboard" className="btn btn-secondary btn-sm mt-3 mx-auto">
            Browse Pools
          </Link>
        </div>
      </div>
    );
  }

  function getPoolSymbols(poolAddress: Address) {
    const pool = pools?.find(p => p.address.toLowerCase() === poolAddress.toLowerCase());
    return {
      shieldedSymbol: pool?.shieldedTokenSymbol ?? "???",
      backingSymbol: pool?.backingTokenSymbol ?? "???",
      shieldedDecimals: pool?.shieldedTokenDecimals ?? 18,
      backingDecimals: pool?.backingTokenDecimals ?? 18,
    };
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">Your Positions</h3>
        <span className="badge badge-outline">{totalPositions}</span>
      </div>

      {shieldPositions.length > 0 && (
        <div className="space-y-2">
          {shieldPositions.map(position => {
            const info = getPoolSymbols(position.poolAddress);
            return (
              <Link key={position.tokenId.toString()} to={`/pools/${position.poolAddress}`}>
                <ShieldPositionCard
                  position={position}
                  tokenSymbol={info.shieldedSymbol}
                  tokenDecimals={info.shieldedDecimals}
                />
              </Link>
            );
          })}
        </div>
      )}

      {protectorPositions.length > 0 && (
        <div className="space-y-2">
          {protectorPositions.map(position => {
            const info = getPoolSymbols(position.poolAddress);
            return (
              <Link key={position.tokenId.toString()} to={`/pools/${position.poolAddress}`}>
                <ProtectorPositionCard
                  position={position}
                  tokenSymbol={info.backingSymbol}
                  tokenDecimals={info.backingDecimals}
                />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
