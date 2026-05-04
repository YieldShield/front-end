import type { ReactNode } from "react";

export function AnimatedStrikethrough({ children }: { children: ReactNode }) {
  return (
    <>
      <style>{`
        @keyframes strike {
          0% {
            transform: scaleX(0);
            transform-origin: left center;
          }
          100% {
            transform: scaleX(1);
            transform-origin: left center;
          }
        }

        .strikethrough-container {
          position: relative;
          display: inline-block;
        }

        .strikethrough-line {
          position: absolute;
          left: 0;
          top: 50%;
          height: 8px;
          width: 100%;
          background-color: currentColor;
          opacity: 0.9;
          animation: strike 0.3s ease-out 0.1s forwards;
          transform: scaleX(0);
          transform-origin: left center;
        }
      `}</style>
      <span className="strikethrough-container">
        {children}
        <span className="strikethrough-line" />
      </span>
    </>
  );
}
