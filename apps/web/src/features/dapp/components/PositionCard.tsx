import { formatAddress, formatTokenAmount } from "../../../protocol/format";
import type { ShieldPosition, ProtectorPosition } from "../../../protocol/positions";

type ShieldPositionCardProps = {
  position: ShieldPosition;
  tokenSymbol: string;
  tokenDecimals: number;
};

export function ShieldPositionCard({ position, tokenSymbol, tokenDecimals }: ShieldPositionCardProps) {
  const depositDate = new Date(position.depositTime * 1000).toLocaleDateString();

  return (
    <div className="card bg-base-100 p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="badge badge-secondary badge-sm">Shield</span>
          <span className="text-sm font-medium">#{position.tokenId.toString()}</span>
        </div>
        <span className={`badge badge-sm ${position.isWithdrawn ? "badge-ghost" : "badge-success"}`}>
          {position.isWithdrawn ? "Withdrawn" : "Active"}
        </span>
      </div>
      <div className="text-lg font-bold">
        {formatTokenAmount(position.amount, tokenDecimals)} {tokenSymbol}
      </div>
      <div className="text-xs text-base-content/50">
        Deposited {depositDate} · Pool {formatAddress(position.poolAddress)}
      </div>
    </div>
  );
}

type ProtectorPositionCardProps = {
  position: ProtectorPosition;
  tokenSymbol: string;
  tokenDecimals: number;
};

export function ProtectorPositionCard({ position, tokenSymbol, tokenDecimals }: ProtectorPositionCardProps) {
  const now = Math.floor(Date.now() / 1000);
  const isUnlocking = position.unlockRequestTime > 0 && position.unlockRequestTime > now;
  const isReady = position.unlockRequestTime > 0 && position.unlockRequestTime <= now;

  const statusLabel = isReady ? "Ready to withdraw" : isUnlocking ? "Unlocking" : "Locked";
  const statusClass = isReady ? "badge-success" : isUnlocking ? "badge-warning" : "badge-outline";

  return (
    <div className="card bg-base-100 p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="badge badge-primary badge-sm">Protector</span>
          <span className="text-sm font-medium">#{position.tokenId.toString()}</span>
        </div>
        <span className={`badge badge-sm ${statusClass}`}>{statusLabel}</span>
      </div>
      <div className="text-lg font-bold">
        {formatTokenAmount(position.amount, tokenDecimals)} {tokenSymbol}
      </div>
      <div className="flex gap-4 text-xs text-base-content/50">
        <span>Available: {formatTokenAmount(position.availableAmount, tokenDecimals)}</span>
        {position.claimableCommission > 0n && (
          <span className="text-success">Commission: {formatTokenAmount(position.claimableCommission, tokenDecimals)}</span>
        )}
      </div>
      <div className="text-xs text-base-content/50">Pool {formatAddress(position.poolAddress)}</div>
    </div>
  );
}
