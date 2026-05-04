type InfoTooltipProps = {
  tip: string;
};

export function InfoTooltip({ tip }: InfoTooltipProps) {
  return (
    <span className="tooltip tooltip-top inline-flex" data-tip={tip}>
      <svg
        className="h-4 w-4 cursor-help text-base-content/45 transition-colors hover:text-base-content/80"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M12 2a10 10 0 1 0 10 10A10.01 10.01 0 0 0 12 2Zm1 15h-2v-2h2Zm1.1-7.75-.9.92A3.13 3.13 0 0 0 12 13h-2v-.5a3.49 3.49 0 0 1 1.03-2.47l1.24-1.26a1.5 1.5 0 1 0-2.56-1.06H7.7a3.5 3.5 0 1 1 6.4 1.79Z" />
      </svg>
      <span className="sr-only">{tip}</span>
    </span>
  );
}
