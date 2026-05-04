import { useEffect, useRef, useState } from "react";
import { AnimatedHero } from "../../home/components/AnimatedHeroLanding";

export function IntroHeroCard() {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            timer = setTimeout(() => setIsVisible(true), 100);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.1 },
    );

    if (cardRef.current) observer.observe(cardRef.current);

    return () => {
      observer.disconnect();
      if (timer) clearTimeout(timer);
    };
  }, []);

  return (
    <div ref={cardRef} className="card bg-base-200 mb-8" style={{ marginTop: "0.5rem" }}>
      <div className="flex flex-col h-full px-4 sm:px-6 lg:px-8 py-6">
        <div
          className="mb-1 flex items-center justify-center overflow-hidden bg-base-200 relative"
          style={{ height: "350px", minHeight: "350px", width: "100%", maxWidth: "100%" }}
        >
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ opacity: isVisible ? 1 : 0, transition: "opacity 0.3s ease-in", maxWidth: "100%", overflow: "hidden" }}
          >
            <AnimatedHero apy={null} shouldAnimate={isVisible} />
          </div>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm font-medium text-secondary">DeFi Abstraction Layer</span>
        </div>
      </div>
    </div>
  );
}
