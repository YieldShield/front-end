import { useEffect, useState } from "react";
import { BlockchainAnimation } from "./BlockchainAnimation";
import { FlipClock } from "./FlipClock";
import { Vault } from "./Vault";

interface RatesComparisonSectionProps {
  yieldValue: number | null;
}

export function RatesComparisonSection({ yieldValue }: RatesComparisonSectionProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const hasLiveRate = typeof yieldValue === "number" && Number.isFinite(yieldValue) && yieldValue > 0;
  // Fintech and bank comparison numbers are marketing reference bars, not protocol data.
  const fintechRate = 3.5;
  const banksRate = 0.4;
  const yieldShieldRate = hasLiveRate ? yieldValue : Math.max(fintechRate, banksRate);
  const maxRate = Math.max(yieldShieldRate, fintechRate, banksRate);
  const yieldShieldHeight = (yieldShieldRate / maxRate) * 100;
  const fintechHeight = (fintechRate / maxRate) * 100;
  const banksHeight = (banksRate / maxRate) * 100;

  return (
    <div className="container mx-auto px-4 py-24">
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .card-animate {
          opacity: 0;
        }

        .card-animate.visible {
          animation: fadeInUp 0.6s ease-out forwards;
        }

        .card-1.visible {
          animation-delay: 0.1s;
        }

        .card-2.visible {
          animation-delay: 0.2s;
        }

        .card-3.visible {
          animation-delay: 0.3s;
        }

        .card-4.visible {
          animation-delay: 0.4s;
        }
      `}</style>

      <h2 className="text-4xl md:text-5xl font-bold text-center mb-16">The Future of Savings Accounts</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className={`card bg-base-200 card-animate card-1 ${isVisible ? "visible" : ""}`}>
          <div className="flex flex-col h-full" style={{ padding: "1.5rem 2rem" }}>
            <div className="flex items-end gap-4 justify-center mb-6" style={{ height: "180px" }}>
              <div className="flex flex-col items-center">
                <div
                  className="w-16 border-2 rounded-t-lg transition-all duration-1000 ease-out flex items-end justify-center pb-1"
                  style={{
                    height: isVisible ? `${banksHeight * 1.7}px` : "0px",
                    minHeight: "32px",
                    backgroundColor: "#4a4558",
                    borderColor: "#6b6378",
                  }}
                >
                  <span className="text-sm font-bold text-white">{banksRate.toFixed(1)}%</span>
                </div>
                <span className="text-sm font-semibold mt-3 text-font-grey">Banks</span>
              </div>

              <div className="flex flex-col items-center">
                <div
                  className="w-16 bg-primary rounded-t-lg transition-all duration-1000 ease-out flex items-end justify-center pb-1"
                  style={{
                    height: isVisible ? `${fintechHeight * 1.7}px` : "0px",
                    minHeight: "56px",
                  }}
                >
                  <span className="text-sm font-bold text-white">{fintechRate.toFixed(1)}%</span>
                </div>
                <span className="text-sm font-semibold mt-3 text-font-grey">Fintech</span>
              </div>

              <div className="flex flex-col items-center">
                <div
                  className="w-16 bg-secondary rounded-t-lg transition-all duration-1000 ease-out flex items-end justify-center pb-1"
                  style={{
                    height: isVisible ? `${yieldShieldHeight * 1.4}px` : "0px",
                    minHeight: "140px",
                  }}
                >
                  <span className="text-lg font-bold text-white">{hasLiveRate ? `${yieldShieldRate.toFixed(1)}%` : "—"}</span>
                </div>
                <span className="text-sm font-semibold mt-3">YieldShield</span>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-medium text-secondary">Truly Composable</span>
            </div>

            <h3 className="text-2xl font-bold mb-2">The Highest Rates</h3>

            <p className="text-font-grey text-lg">
              YieldShield offers the highest rates, given that it integrates various protocols and automatically finds
              the best pool in a hypercompetitive market.
            </p>
          </div>
        </div>

        <div className={`card bg-base-200 card-animate card-2 ${isVisible ? "visible" : ""}`}>
          <div className="flex flex-col h-full" style={{ padding: "1.5rem 2rem" }}>
            <div className="mb-6 flex items-center justify-center" style={{ height: "180px" }}>
              <FlipClock />
            </div>

            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-medium text-secondary">Every Second Counts</span>
            </div>

            <h3 className="text-2xl font-bold mb-2">Fastest Claim Process</h3>

            <p className="text-font-grey text-lg">
              You simply decide if you want to withdraw your original asset, including the earned yield, or if you want
              to claim the collateral without yield. No lengthy claims process.
            </p>
          </div>
        </div>

        <div className={`card bg-base-200 card-animate card-3 ${isVisible ? "visible" : ""}`}>
          <div className="flex flex-col h-full" style={{ padding: "1.5rem 2rem" }}>
            <div className="mb-6 flex items-center justify-center" style={{ height: "180px" }}>
              <Vault />
            </div>

            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-medium text-secondary">Trustless Coverage</span>
            </div>

            <h3 className="text-2xl font-bold mb-2">The Best Protection</h3>

            <p className="text-font-grey text-lg">
              You get 100% of your money back if there is any issue that reduces the value of your asset: no legal
              risk, fine print, or hidden information.
            </p>
          </div>
        </div>

        <div className={`card bg-base-200 card-animate card-4 ${isVisible ? "visible" : ""}`}>
          <div className="flex flex-col h-full" style={{ padding: "1.5rem 2rem" }}>
            <div className="mb-6 flex items-center justify-center" style={{ height: "180px" }}>
              <BlockchainAnimation />
            </div>

            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-medium text-secondary">Blockchain + AI</span>
            </div>

            <h3 className="text-2xl font-bold mb-2">Highly Capital Efficient</h3>

            <p className="text-font-grey text-lg">
              Using blockchain and AI, YieldShield creates a highly capital-efficient protection protocol, resulting in
              the lowest possible commission rates for you.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
