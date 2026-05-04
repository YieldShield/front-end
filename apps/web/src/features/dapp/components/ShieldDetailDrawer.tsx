import { useState } from "react";
import { Drawer } from "../../../components/Drawer";

interface ShieldDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ShieldDetailDrawer({ isOpen, onClose }: ShieldDetailDrawerProps) {
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  return (
    <Drawer isOpen={isOpen} onClose={onClose}>
      {/* Header */}
      <div className="p-4 border-b border-base-300">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">Shield Protection</h3>
          <button onClick={onClose} className="btn btn-ghost btn-circle">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4">
        {/* Protection summary */}
        <div className="rounded-xl p-5 text-center" style={{ backgroundColor: "var(--ys-success-bg-strong)" }}>
          <svg className="w-12 h-12 mx-auto mb-3" style={{ color: "var(--ys-success)" }} viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3z" />
          </svg>
          <h4 className="text-xl font-bold" style={{ color: "var(--ys-success)" }}>
            100% Principal Protection
          </h4>
          <p className="text-sm text-font-grey mt-2">
            Every deposit is backed by on-chain collateral from protectors.
          </p>
        </div>

        {/* Trust badges */}
        <div className="space-y-3">
          <div className="card bg-base-100 p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: "var(--ys-success-bg)" }}>
              <svg className="w-5 h-5" style={{ color: "var(--ys-success)" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 12l2 2 4-4" />
                <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-sm">On-chain</p>
              <p className="text-xs text-font-grey">All protection logic is enforced by smart contracts</p>
            </div>
          </div>

          <div className="card bg-base-100 p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: "var(--ys-success-bg)" }}>
              <svg className="w-5 h-5" style={{ color: "var(--ys-success)" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-sm">Instant Claims</p>
              <p className="text-xs text-font-grey">No waiting periods, no claim process. Withdraw anytime.</p>
            </div>
          </div>

          <div className="card bg-base-100 p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: "var(--ys-success-bg)" }}>
              <svg className="w-5 h-5" style={{ color: "var(--ys-success)" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-sm">No Exclusions</p>
              <p className="text-xs text-font-grey">Protection covers all scenarios — no fine print.</p>
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div className="border-t border-base-300 pt-4">
          <button
            onClick={() => setShowHowItWorks(!showHowItWorks)}
            className="flex items-center gap-2 text-sm font-medium text-secondary cursor-pointer"
          >
            <svg
              className={`w-4 h-4 transition-transform ${showHowItWorks ? "rotate-90" : ""}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
            How It Works
          </button>
          {showHowItWorks && (
            <div className="mt-3 space-y-2 text-sm text-font-grey">
              <p>
                <strong>1. Deposit:</strong> You deposit tokens into a shield pool. Your position is represented as an NFT.
              </p>
              <p>
                <strong>2. Protection:</strong> Protectors provide backing collateral. The pool&apos;s collateral ratio determines how much backing exists per shielded deposit.
              </p>
              <p>
                <strong>3. Withdraw:</strong> Withdraw anytime in the original token. After 24 hours, you can also activate the shield to receive the backing token at oracle price.
              </p>
              <p>
                <strong>4. Fees:</strong> A small commission and pool fee are applied. These compensate protectors for providing collateral.
              </p>
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
}
