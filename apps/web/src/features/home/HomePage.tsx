import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { usePoolYields } from "../../hooks/usePoolYield";
import { useProtocolChain } from "../../hooks/useProtocolChain";
import { fetchPoolsForChain } from "../../protocol/pools";
import { computeNetApy } from "../../protocol/yields";
import { AnimatedStrikethrough } from "./components/AnimatedStrikethrough";
import { HeroWithYield } from "./components/HeroWithYield";
import { RatesComparisonSection } from "./components/RatesComparisonSection";

export function HomePage() {
  const { activeProtocolChain } = useProtocolChain();
  const { data: pools = [] } = useQuery({
    queryKey: ["home-pools", activeProtocolChain.id],
    queryFn: () => fetchPoolsForChain(activeProtocolChain.id),
  });
  const shieldedSymbols = useMemo(() => pools.map(pool => pool.shieldedTokenSymbol), [pools]);
  const { yieldsBySymbol, isLoading: isYieldsLoading } = usePoolYields(shieldedSymbols);

  const bestNetApy = useMemo(() => {
    let best: number | null = null;
    for (const pool of pools) {
      const match = yieldsBySymbol.get(pool.shieldedTokenSymbol.toLowerCase());
      const netApy = computeNetApy(match?.apy, pool.commissionRate + pool.poolFee);
      if (netApy === null) continue;
      if (best === null || netApy > best) best = netApy;
    }
    return best;
  }, [pools, yieldsBySymbol]);

  return (
    <div className="min-h-screen bg-base-100" style={{ background: "var(--color-base-100)" }}>
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center min-h-[600px]">
          <div className="space-y-8">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
              <AnimatedStrikethrough>Your Bank</AnimatedStrikethrough>
              <br />
              You Earn the Highest
              <br />
              <span className="text-secondary">Risk Free Yield</span>
            </h1>
            <p className="text-font-grey text-lg">Earn Interest With the Highest Rates and Balance Protection</p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/dapp" className="btn btn-secondary btn-lg">
                Earn Now (Beta)
              </Link>
              <Link to="/docs" className="btn btn-outline btn-lg">
                Learn More
              </Link>
            </div>
            <p className="text-sm text-base-content/60">
              Using direct on-chain discovery on {activeProtocolChain.label}. {pools.length} active pool
              {pools.length === 1 ? "" : "s"} currently readable in the static app.
            </p>
          </div>

          <HeroWithYield apy={bestNetApy} isLoading={isYieldsLoading && bestNetApy === null} />
        </div>
      </div>

      <RatesComparisonSection yieldValue={bestNetApy} />

      <div className="container mx-auto px-4 py-24">
        <h2 className="text-4xl font-bold text-center mb-12">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-secondary/20 rounded-full flex items-center justify-center text-2xl font-bold text-secondary mx-auto mb-4">
              1
            </div>
            <h3 className="text-xl font-bold mb-3">Setup</h3>
            <p className="text-font-grey">
              Risk experts set up pools that charge a commission on the yield for a specific asset. Professional
              protectors enter the pools with collateral, thereby providing 100% protection.
            </p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-secondary/20 rounded-full flex items-center justify-center text-2xl font-bold text-secondary mx-auto mb-4">
              2
            </div>
            <h3 className="text-xl font-bold mb-3">Deposit</h3>
            <p className="text-font-grey">
              The UI automatically compares available pools and the commission that they charge. You simply enter the
              pool with the highest risk-free yield.
            </p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-secondary/20 rounded-full flex items-center justify-center text-2xl font-bold text-secondary mx-auto mb-4">
              3
            </div>
            <h3 className="text-xl font-bold mb-3">Withdraw</h3>
            <p className="text-font-grey">
              You can withdraw your assets and earnings at any time. If something happens, you can withdraw the
              collateral provided by the protector.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
