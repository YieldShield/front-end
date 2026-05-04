import { useState } from "react";

type ShieldedBannerProps = {
  onClick?: () => void;
  className?: string;
};

export function ShieldedBanner({ onClick, className = "" }: ShieldedBannerProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative w-full rounded-xl px-4 py-3 md:px-5 md:py-4 transition-all duration-200 ${
        onClick ? "cursor-pointer" : "cursor-default"
      } ${className}`}
      style={{
        backgroundColor: "var(--ys-success-bg-strong)",
        borderWidth: "1px",
        borderStyle: "solid",
        borderColor: onClick && isHovered ? "var(--ys-success)" : "var(--ys-success-border)",
      }}
      type="button"
      aria-label="Learn about principal protection"
    >
      <div className="flex items-center gap-3">
        <div
          className="flex-shrink-0 w-10 h-10 md:w-11 md:h-11 rounded-full flex items-center justify-center transition-transform duration-200"
          style={{
            backgroundColor: "var(--ys-success-bg-strong)",
            transform: onClick && isHovered ? "scale(1.05)" : "scale(1)",
          }}
        >
          <svg
            className="w-5 h-5 md:w-6 md:h-6"
            style={{ color: "var(--ys-success)" }}
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3zm-1.5 12.5l-3-3 1.41-1.41L10.5 11.67l4.59-4.59L16.5 8.5l-6 6z"
            />
          </svg>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-base md:text-lg font-semibold" style={{ color: "var(--ys-success)" }}>
            100% Principal Shielded
          </span>
          <span
            className="px-2 py-0.5 text-xs font-medium rounded-full"
            style={{ backgroundColor: "var(--ys-success-bg-strong)", color: "var(--ys-success)" }}
          >
            SHIELDED
          </span>
        </div>

        {onClick && (
          <div className="flex-shrink-0 ml-auto">
            <svg
              className="w-4 h-4 transition-transform duration-200"
              style={{
                color: "var(--ys-success)",
                opacity: 0.6,
                transform: isHovered ? "translateX(2px)" : "translateX(0)",
              }}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        )}
      </div>
    </button>
  );
}
