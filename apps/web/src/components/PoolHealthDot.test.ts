import { describe, expect, it } from "vitest";
import { getPoolHealthSignal } from "./PoolHealthDot";

const unit = (whole: number) => BigInt(whole) * 10n ** 18n;
const unitWithDecimals = (whole: number, decimals: number) => BigInt(whole) * 10n ** BigInt(decimals);

describe("getPoolHealthSignal", () => {
  it("flags zero backing as risk without a utilization number", () => {
    expect(getPoolHealthSignal(unit(5), 0n, 10_000n)).toEqual({ tone: "risk", utilization: null });
  });

  it("flags zero collateral ratio as risk", () => {
    expect(getPoolHealthSignal(unit(5), unit(10), 0n)).toEqual({ tone: "risk", utilization: null });
  });

  it("treats an empty shielded balance as healthy when backing exists", () => {
    const signal = getPoolHealthSignal(0n, unit(10), 10_000n);
    expect(signal.tone).toBe("healthy");
    expect(signal.utilization).toBe(0);
  });

  it("classifies <50% utilization as healthy", () => {
    // 1 shielded vs 10 backing @ 1:1 ratio = 10% filled
    const signal = getPoolHealthSignal(unit(1), unit(10), 10_000n);
    expect(signal.tone).toBe("healthy");
    expect(signal.utilization).toBeCloseTo(0.1, 5);
  });

  it("classifies 50–90% utilization as warning", () => {
    // 6 shielded vs 10 backing @ 1:1 = 60% filled
    const signal = getPoolHealthSignal(unit(6), unit(10), 10_000n);
    expect(signal.tone).toBe("warning");
    expect(signal.utilization).toBeCloseTo(0.6, 5);
  });

  it("classifies >=90% utilization as risk", () => {
    // 10 shielded vs 10 backing @ 1:1 = 100% filled
    const signal = getPoolHealthSignal(unit(10), unit(10), 10_000n);
    expect(signal.tone).toBe("risk");
    expect(signal.utilization).toBeCloseTo(1, 5);
  });

  it("accounts for the pool's over-collateralization requirement", () => {
    // 10 backing at 1.5x ratio only covers ~6.67 shielded; 3 shielded = 45% filled → healthy
    const signal = getPoolHealthSignal(unit(3), unit(10), 15_000n);
    expect(signal.tone).toBe("healthy");
    expect(signal.utilization).toBeCloseTo(0.45, 2);
  });

  it("normalizes shielded and backing token decimals before comparing balances", () => {
    // 1 shielded token with 18 decimals vs 10 backing tokens with 6 decimals @ 1:1 = 10% filled
    const signal = getPoolHealthSignal(unitWithDecimals(1, 18), unitWithDecimals(10, 6), 10_000n, 18, 6);
    expect(signal.tone).toBe("healthy");
    expect(signal.utilization).toBeCloseTo(0.1, 5);
  });
});
