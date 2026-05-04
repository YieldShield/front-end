type PoolHealthDotProps = {
  shieldedBalance: bigint;
  backingBalance: bigint;
  collateralRatio: bigint;
  shieldedTokenDecimals: number;
  backingTokenDecimals: number;
};

export type PoolHealthTone = "healthy" | "warning" | "risk";

export type PoolHealthSignal = {
  tone: PoolHealthTone;
  utilization: number | null;
};

const UTILIZATION_SCALE = 1_000_000n;

function getTokenScale(decimals: number) {
  return Number.isInteger(decimals) && decimals >= 0 ? 10n ** BigInt(decimals) : 10n ** 18n;
}

export function getPoolHealthSignal(
  shieldedBalance: bigint,
  backingBalance: bigint,
  collateralRatio: bigint,
  shieldedTokenDecimals = 18,
  backingTokenDecimals = 18,
): PoolHealthSignal {
  if (backingBalance === 0n || collateralRatio === 0n) {
    return { tone: "risk", utilization: null };
  }

  const shieldedScale = getTokenScale(shieldedTokenDecimals);
  const backingScale = getTokenScale(backingTokenDecimals);
  const denominator = backingBalance * shieldedScale * 10_000n;
  if (denominator === 0n) {
    return { tone: "risk", utilization: null };
  }

  const scaled = (shieldedBalance * backingScale * collateralRatio * UTILIZATION_SCALE) / denominator;
  const utilization = Number(scaled) / Number(UTILIZATION_SCALE);

  if (utilization >= 0.9) return { tone: "risk", utilization };
  if (utilization >= 0.5) return { tone: "warning", utilization };
  return { tone: "healthy", utilization };
}

function describeSignal({ tone, utilization }: PoolHealthSignal): string {
  if (utilization === null) {
    return "No backing deposited yet";
  }

  const pct = (utilization * 100).toFixed(0);
  if (tone === "risk") return `At capacity: ${pct}% filled`;
  if (tone === "warning") return `Filling up: ${pct}% of capacity used`;
  return `Healthy capacity: ${pct}% filled`;
}

export function PoolHealthDot({
  shieldedBalance,
  backingBalance,
  collateralRatio,
  shieldedTokenDecimals,
  backingTokenDecimals,
}: PoolHealthDotProps) {
  const signal = getPoolHealthSignal(
    shieldedBalance,
    backingBalance,
    collateralRatio,
    shieldedTokenDecimals,
    backingTokenDecimals,
  );
  const label = describeSignal(signal);
  return <span className={`health-dot is-${signal.tone}`} aria-label={label} title={label} />;
}
