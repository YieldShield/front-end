export function BlockchainAnimation() {
  return (
    <div className="flex items-center justify-center mb-6" style={{ minHeight: "140px" }}>
      <div className="spinner">
        <div className="block"></div>
        <div className="chain"></div>
      </div>
      <style>{`
        .spinner {
          --widthSpinner: 280px;
          --colorSpinner: var(--color-secondary);
          --colorSpinnerBackground: var(--color-base-300);
          width: var(--widthSpinner);
          height: calc(0.2 * var(--widthSpinner));
          position: relative;
          overflow: hidden;
          backface-visibility: hidden;
          background-color: var(--colorSpinnerBackground);
          box-shadow: 0 0 0 calc(0.1 * var(--widthSpinner)) var(--colorSpinnerBackground);
          border-radius: 0.15em;
        }

        .block {
          width: calc(0.21 * var(--widthSpinner));
          height: calc(0.21 * var(--widthSpinner));
          position: absolute;
          top: calc(0.1 * var(--widthSpinner));
          left: 0;
          background-color: transparent;
          box-shadow:
            calc((0.2 + 0) * var(--widthSpinner)) 0 var(--colorSpinner),
            calc((0.2 + 0.4) * var(--widthSpinner)) 0 var(--colorSpinner),
            calc((0.2 + 0.8) * var(--widthSpinner)) 0 var(--colorSpinner),
            calc((0.2 + 1.2) * var(--widthSpinner)) 0 var(--colorSpinner);
          transform: translate(calc(-100% - 0 * var(--widthSpinner)), -50%);
          will-change: transform;
          animation: moveit ease-in-out 1.5s infinite forwards;
          border-radius: 0.1em;
        }

        .chain {
          width: calc(1 * var(--widthSpinner));
          height: calc(0.03 * var(--widthSpinner));
          background-color: var(--colorSpinner);
          position: absolute;
          top: calc(0.1 * var(--widthSpinner));
          left: -1px;
          transform: translate(0, -50%);
        }

        @keyframes moveit {
          0% {
            transform: translate(calc(-100% - 0 * var(--widthSpinner)), -50%);
          }
          66%,
          100% {
            transform: translate(calc(-100% - 0.4 * var(--widthSpinner)), -50%);
          }
        }
      `}</style>
    </div>
  );
}
