import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { InfoTooltip } from "../../components/InfoTooltip";
import { PoolHealthDot } from "../../components/PoolHealthDot";
import { TokenPairMark } from "../../components/TokenPairMark";
import { usePoolYields } from "../../hooks/usePoolYield";
import { useProtocolChain } from "../../hooks/useProtocolChain";
import { formatAddress, formatBps, formatTokenAmount } from "../../protocol/format";
import { fetchPoolsForChain } from "../../protocol/pools";
import type { TokenYield } from "../../protocol/yields";

type SortKey = "pool" | "apy" | "commission" | "collateral" | "backing" | "created";

function compareValues<T>(left: T, right: T, direction: "asc" | "desc") {
  if (left === right) return 0;
  const result = left > right ? 1 : -1;
  return direction === "asc" ? result : -result;
}

export function PoolsPage() {
  const { activeProtocolChain } = useProtocolChain();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("created");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const { data, error, isLoading } = useQuery({
    queryKey: ["pools", activeProtocolChain.id],
    queryFn: () => fetchPoolsForChain(activeProtocolChain.id),
  });

  const shieldedSymbols = useMemo(() => data?.map(pool => pool.shieldedTokenSymbol) ?? [], [data]);
  const { yieldsBySymbol, isLoading: isYieldsLoading } = usePoolYields(shieldedSymbols);

  const getYieldForSymbol = (symbol: string): TokenYield | null =>
    yieldsBySymbol.get(symbol.toLowerCase()) ?? null;

  const visiblePools = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const matchingPools = data?.filter(pool => {
      if (!normalizedQuery) return true;
      return [
        pool.address,
        pool.creator,
        pool.shieldedTokenSymbol,
        pool.backingTokenSymbol,
        `${pool.shieldedTokenSymbol}/${pool.backingTokenSymbol}`,
      ].some(value => value.toLowerCase().includes(normalizedQuery));
    });

    return [...(matchingPools ?? [])].sort((left, right) => {
      switch (sortKey) {
        case "pool":
          return compareValues(
            `${left.shieldedTokenSymbol}/${left.backingTokenSymbol}`,
            `${right.shieldedTokenSymbol}/${right.backingTokenSymbol}`,
            sortDirection,
          );
        case "apy": {
          const leftApy = yieldsBySymbol.get(left.shieldedTokenSymbol.toLowerCase())?.apy ?? -Infinity;
          const rightApy = yieldsBySymbol.get(right.shieldedTokenSymbol.toLowerCase())?.apy ?? -Infinity;
          return compareValues(leftApy, rightApy, sortDirection);
        }
        case "commission":
          return compareValues(left.commissionRate + left.poolFee, right.commissionRate + right.poolFee, sortDirection);
        case "collateral":
          return compareValues(left.collateralRatio, right.collateralRatio, sortDirection);
        case "backing":
          return compareValues(left.backingBalance, right.backingBalance, sortDirection);
        case "created":
        default:
          return compareValues(left.createdAt, right.createdAt, sortDirection);
      }
    });
  }, [data, searchQuery, sortDirection, sortKey, yieldsBySymbol]);

  const averageFeeRate =
    data && data.length > 0
      ? data.reduce((sum, pool) => sum + Number(pool.commissionRate + pool.poolFee), 0) / data.length
      : null;

  function toggleSort(nextKey: SortKey) {
    if (nextKey === sortKey) {
      setSortDirection(current => (current === "desc" ? "asc" : "desc"));
      return;
    }
    setSortKey(nextKey);
    setSortDirection("desc");
  }

  return (
    <div className="space-y-6">
      <div className="card bg-base-200">
        <div className="card-body">
          <div className="mb-4 flex items-center justify-between gap-4 flex-wrap">
            <h3 className="text-lg font-bold">Pools</h3>
            <div className="flex flex-wrap items-center gap-3">
              {averageFeeRate !== null && (
                <div className="badge badge-outline">{(averageFeeRate / 100).toFixed(2)}% avg fee</div>
              )}
              <label className="w-full max-w-md sm:w-auto">
                <input
                  className="legacy-input"
                  placeholder="Search by address or token symbols..."
                  value={searchQuery}
                  onChange={event => setSearchQuery(event.target.value)}
                />
              </label>
              <Link to="/pools/create" className="btn btn-secondary btn-sm">
                Create Pool
              </Link>
            </div>
          </div>

          <div className="overflow-x-auto sm:overflow-x-visible min-h-[280px] -mx-4 sm:mx-0">
            <table className="table table-compact w-full text-sm sm:min-w-0">
              <thead>
                <tr>
                  <th className="cursor-pointer select-none px-2 hover:bg-base-200" onClick={() => toggleSort("pool")}>
                    <div className="flex items-center gap-1">
                      Pool
                      {sortKey === "pool" ? (sortDirection === "desc" ? "▼" : "▲") : null}
                    </div>
                  </th>
                  <th className="cursor-pointer select-none px-2 text-center hover:bg-base-200" onClick={() => toggleSort("apy")}>
                    <div className="flex items-center justify-center gap-1">
                      APY
                      <InfoTooltip tip="Reference yield from DeFiLlama (mainnet equivalent of the shielded token)." />
                      {sortKey === "apy" ? (sortDirection === "desc" ? "▼" : "▲") : null}
                    </div>
                  </th>
                  <th className="px-2 text-center">Creator</th>
                  <th className="px-2 text-center">Exposure</th>
                  <th className="cursor-pointer select-none px-2 text-center hover:bg-base-200" onClick={() => toggleSort("commission")}>
                    <div className="flex items-center justify-center gap-1">
                      Fees
                      {sortKey === "commission" ? (sortDirection === "desc" ? "▼" : "▲") : null}
                    </div>
                  </th>
                  <th className="cursor-pointer select-none px-2 text-center hover:bg-base-200" onClick={() => toggleSort("collateral")}>
                    <div className="flex items-center justify-center gap-1">
                      Collateral
                      {sortKey === "collateral" ? (sortDirection === "desc" ? "▼" : "▲") : null}
                    </div>
                  </th>
                  <th className="cursor-pointer select-none px-2 text-center hover:bg-base-200" onClick={() => toggleSort("backing")}>
                    <div className="flex items-center justify-center gap-1">
                      Backing
                      {sortKey === "backing" ? (sortDirection === "desc" ? "▼" : "▲") : null}
                    </div>
                  </th>
                  <th className="px-2 text-center">Shielded</th>
                  <th className="cursor-pointer select-none px-2 text-center hover:bg-base-200" onClick={() => toggleSort("created")}>
                    <div className="flex items-center justify-center gap-1">
                      Created
                      {sortKey === "created" ? (sortDirection === "desc" ? "▼" : "▲") : null}
                    </div>
                  </th>
                  <th className="px-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      Health
                      <InfoTooltip tip="Health is approximated from live collateral ratios and backing balances." />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-font-grey">
                      <span className="loading loading-spinner loading-md" />
                    </td>
                  </tr>
                ) : error instanceof Error ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-error">
                      {error.message}
                    </td>
                  </tr>
                ) : !data || data.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-font-grey">
                      No pools available yet. Be the first to create one.
                    </td>
                  </tr>
                ) : visiblePools.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-font-grey">
                      No pools found matching &quot;{searchQuery}&quot;.
                    </td>
                  </tr>
                ) : (
                  visiblePools.map(pool => (
                    <tr key={pool.address}>
                      <td className="px-2">
                        <Link to={`/pools/${pool.address}`} className="block">
                          <div className="flex items-center gap-3">
                            <TokenPairMark
                              shieldedSymbol={pool.shieldedTokenSymbol}
                              backingSymbol={pool.backingTokenSymbol}
                            />
                            <div>
                              <div className="font-semibold">
                                {pool.shieldedTokenSymbol} / {pool.backingTokenSymbol}
                              </div>
                              <div className="text-xs text-font-grey">{pool.address}</div>
                            </div>
                          </div>
                        </Link>
                      </td>
                      <td className="px-2 text-center">
                        {(() => {
                          const poolYield = getYieldForSymbol(pool.shieldedTokenSymbol);
                          if (poolYield) {
                            return (
                              <>
                                <div className="font-semibold">{poolYield.apy.toFixed(2)}%</div>
                                <div className="text-xs text-font-grey">via {poolYield.project}</div>
                              </>
                            );
                          }
                          if (isYieldsLoading) {
                            return <span className="loading loading-spinner loading-xs" aria-hidden="true" />;
                          }
                          return <span className="text-font-grey">—</span>;
                        })()}
                      </td>
                      <td className="px-2 text-center font-medium">{formatAddress(pool.creator)}</td>
                      <td className="px-2 text-center text-xs text-font-grey">
                        {pool.shieldedTokenSymbol} protected by {pool.backingTokenSymbol}
                      </td>
                      <td className="px-2 text-center">
                        <div className="font-semibold">{formatBps(pool.commissionRate + pool.poolFee)}</div>
                        <div className="text-xs text-font-grey">
                          {formatBps(pool.commissionRate)} + {formatBps(pool.poolFee)}
                        </div>
                      </td>
                      <td className="px-2 text-center">{formatBps(pool.collateralRatio)}</td>
                      <td className="px-2 text-center">
                        {formatTokenAmount(pool.backingBalance, pool.backingTokenDecimals)} {pool.backingTokenSymbol}
                      </td>
                      <td className="px-2 text-center">
                        {formatTokenAmount(pool.shieldedBalance, pool.shieldedTokenDecimals)} {pool.shieldedTokenSymbol}
                      </td>
                      <td className="px-2 text-center">{pool.createdAtLabel}</td>
                      <td className="px-2 text-center">
                        <div className="flex justify-center">
                          <PoolHealthDot
                            shieldedBalance={pool.shieldedBalance}
                            backingBalance={pool.backingBalance}
                            collateralRatio={pool.collateralRatio}
                            shieldedTokenDecimals={pool.shieldedTokenDecimals}
                            backingTokenDecimals={pool.backingTokenDecimals}
                          />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
