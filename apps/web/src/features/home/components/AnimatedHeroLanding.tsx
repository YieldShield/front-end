import { useEffect, useState } from "react";

interface AnimatedHeroProps {
  apy?: number | null;
  isLoading?: boolean;
  shouldAnimate?: boolean;
}

export function AnimatedHero({ apy, isLoading = false, shouldAnimate = false }: AnimatedHeroProps) {
  const hasApy = typeof apy === "number" && Number.isFinite(apy);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!shouldAnimate) {
      return;
    }

    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 100);

    return () => clearTimeout(timer);
  }, [shouldAnimate]);

  return (
    <div className="relative w-full overflow-hidden bg-base-100" style={{ minHeight: "350px", maxWidth: "100%" }}>
      <style>{`
        @keyframes ai-blob {
          0% {
            border-radius: 30% 70% 70% 30% / 30% 30% 70% 70%;
          }
          20% {
            border-radius: 60% 40% 40% 60% / 60% 25% 75% 40%;
          }
          40% {
            border-radius: 70% 30% 65% 35% / 80% 45% 55% 20%;
          }
          60% {
            border-radius: 30% 70% 70% 30% / 20% 30% 70% 80%;
          }
          80% {
            border-radius: 40% 60% 40% 60% / 70% 55% 45% 30%;
          }
          100% {
            border-radius: 30% 70% 70% 30% / 30% 30% 70% 70%;
          }
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .apy-number {
          animation: fadeInUp 0.6s ease-out forwards;
        }

        .blob {
          width: 280px;
          height: 280px;
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background-color: var(--ys-blob-primary);
          animation: ai-blob 8s linear infinite;
          z-index: 4;
        }

        .blob1 {
          width: 310px;
          height: 310px;
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background-color: var(--ys-blob-ring-1);
          animation: ai-blob 10s linear infinite;
          animation-direction: reverse;
          z-index: 3;
        }

        .blob2 {
          width: 330px;
          height: 330px;
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background-color: var(--ys-blob-ring-2);
          animation: ai-blob 12s linear infinite;
          z-index: 2;
        }

        @media (max-width: 640px) {
          .blob {
            width: 200px;
            height: 200px;
          }

          .blob1 {
            width: 220px;
            height: 220px;
          }

          .blob2 {
            width: 240px;
            height: 240px;
          }
        }
      `}</style>

      <div className="blob2"></div>
      <div className="blob1"></div>
      <div className="blob"></div>

      <div className="relative z-10 flex flex-col items-center justify-center" style={{ minHeight: "350px" }}>
        <div
          className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white apy-number"
          style={{ opacity: isVisible ? 1 : 0 }}
        >
          {hasApy ? `${apy.toFixed(2)}%` : isLoading ? <span className="loading loading-spinner loading-lg" aria-hidden="true" /> : "—"}
        </div>
      </div>
    </div>
  );
}
