import { useEffect, useRef, useState } from "react";
import { BlockchainAnimation } from "../../home/components/BlockchainAnimation";
import { FlipClock } from "../../home/components/FlipClock";
import { Vault } from "../../home/components/Vault";
import { AnimationPlaceholder } from "./AnimationPlaceholder";

export type FeatureCardType =
  | "highest-rates"
  | "claim-process"
  | "protection"
  | "capital-efficiency"
  | "defi-adapter";

type FeatureCardProps = {
  type: FeatureCardType;
  yieldValue?: number | null;
};

// Fintech/bank comparison numbers are marketing references, not protocol data.
const FINTECH_RATE = 3.5;
const BANKS_RATE = 0.4;
const DEFAULT_YS_RATE = 10.0;

export function FeatureCard({ type, yieldValue = null }: FeatureCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [shouldLoadAnimation, setShouldLoadAnimation] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setShouldLoadAnimation(true);
            setIsVisible(true);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.1 },
    );
    if (cardRef.current) observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, []);

  if (type === "highest-rates") {
    const rate = typeof yieldValue === "number" && yieldValue > 0 ? yieldValue : DEFAULT_YS_RATE;
    const maxRate = Math.max(rate, FINTECH_RATE, BANKS_RATE);
    const ysHeight = (rate / maxRate) * 100;
    const fintechHeight = (FINTECH_RATE / maxRate) * 100;
    const banksHeight = (BANKS_RATE / maxRate) * 100;

    return (
      <div ref={cardRef} className="card bg-base-200 mb-8">
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
                <span className="text-sm font-bold text-white">{BANKS_RATE.toFixed(1)}%</span>
              </div>
              <span className="text-sm font-semibold mt-3 text-font-grey">Banks</span>
            </div>

            <div className="flex flex-col items-center">
              <div
                className="w-16 bg-primary rounded-t-lg transition-all duration-1000 ease-out flex items-end justify-center pb-1"
                style={{ height: isVisible ? `${fintechHeight * 1.7}px` : "0px", minHeight: "56px" }}
              >
                <span className="text-sm font-bold text-white">{FINTECH_RATE.toFixed(1)}%</span>
              </div>
              <span className="text-sm font-semibold mt-3 text-font-grey">Fintech</span>
            </div>

            <div className="flex flex-col items-center">
              <div
                className="w-16 bg-secondary rounded-t-lg transition-all duration-1000 ease-out flex items-end justify-center pb-1"
                style={{ height: isVisible ? `${ysHeight * 1.4}px` : "0px", minHeight: "140px" }}
              >
                <span className="text-lg font-bold text-white">{rate.toFixed(1)}%</span>
              </div>
              <span className="text-sm font-semibold mt-3">YieldShield</span>
            </div>
          </div>

          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-medium text-secondary">Truly Composable</span>
          </div>
        </div>
      </div>
    );
  }

  if (type === "claim-process") {
    return (
      <div ref={cardRef} className="card bg-base-200 mb-8">
        <div className="flex flex-col h-full" style={{ padding: "1.5rem 2rem" }}>
          <div className="mb-6 flex items-center justify-center" style={{ height: "180px" }}>
            {shouldLoadAnimation ? <FlipClock /> : <AnimationPlaceholder height="180px" />}
          </div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-medium text-primary">Every Second Counts</span>
          </div>
        </div>
      </div>
    );
  }

  if (type === "protection") {
    return (
      <div ref={cardRef} className="card bg-base-200 mb-8">
        <div className="flex flex-col h-full" style={{ padding: "1.5rem 2rem" }}>
          <div className="mb-6 flex items-center justify-center" style={{ height: "180px" }}>
            {shouldLoadAnimation ? <Vault /> : <AnimationPlaceholder height="180px" />}
          </div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-medium text-secondary">Trustless Coverage</span>
          </div>
        </div>
      </div>
    );
  }

  if (type === "capital-efficiency") {
    return (
      <div ref={cardRef} className="card bg-base-200 mb-8">
        <div className="flex flex-col h-full" style={{ padding: "1.5rem 2rem" }}>
          <div className="mb-6 flex items-center justify-center" style={{ height: "180px" }}>
            {shouldLoadAnimation ? <BlockchainAnimation /> : <AnimationPlaceholder height="180px" />}
          </div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-medium text-primary">Blockchain + AI</span>
          </div>
        </div>
      </div>
    );
  }

  // defi-adapter falls back to a static placeholder — the full app's
  // DeFiAdapterAnimation isn't ported into lite yet.
  return (
    <div ref={cardRef} className="card bg-base-200 mb-8">
      <div className="flex flex-col h-full" style={{ padding: "1.5rem 2rem" }}>
        <div className="mb-6 flex items-center justify-center" style={{ height: "180px" }}>
          <AnimationPlaceholder height="180px" />
        </div>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm font-medium text-secondary">Universal Compatibility</span>
        </div>
      </div>
    </div>
  );
}
