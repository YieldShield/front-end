import { useEffect, useState } from "react";
import { AnimatedHero } from "./AnimatedHeroLanding";

type HeroWithYieldProps = {
  apy?: number | null;
  isLoading?: boolean;
  onYieldChange?: (yieldValue: number | null) => void;
  shouldAnimate?: boolean;
};

export function HeroWithYield({ apy = null, isLoading = false, onYieldChange, shouldAnimate = true }: HeroWithYieldProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    onYieldChange?.(apy);
  }, [apy, onYieldChange]);

  useEffect(() => {
    if (!shouldAnimate) {
      return;
    }

    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 600);

    return () => clearTimeout(timer);
  }, [shouldAnimate]);

  return (
    <div
      className="flex items-center justify-center bg-base-100"
      style={{
        opacity: isVisible ? 1 : 0,
        transition: "opacity 0.3s ease-in",
      }}
    >
      <AnimatedHero apy={apy} isLoading={isLoading} shouldAnimate={isVisible} />
    </div>
  );
}
