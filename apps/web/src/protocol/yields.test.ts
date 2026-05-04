import { describe, expect, it } from "vitest";
import { computeNetApy, findApyForToken, isTokenYieldSupported, type LlamaPool } from "./yields";

function makePool(overrides: Partial<LlamaPool>): LlamaPool {
  return {
    chain: "Ethereum",
    project: "lido",
    symbol: "STETH",
    apyBase: 3.1,
    apy: 3.3,
    tvlUsd: 1_000_000,
    pool: "pool-id",
    ...overrides,
  };
}

describe("isTokenYieldSupported", () => {
  it("accepts the shielded-token symbols present on the Arbitrum Sepolia deployment", () => {
    for (const symbol of ["SUSDE", "SDAI", "STETH", "RLP", "USDY", "gtUSDC"]) {
      expect(isTokenYieldSupported(symbol)).toBe(true);
    }
  });

  it("returns false for unknown symbols", () => {
    expect(isTokenYieldSupported("UNKNOWN")).toBe(false);
    expect(isTokenYieldSupported("")).toBe(false);
  });
});

describe("findApyForToken", () => {
  it("matches by chain, project, and symbol (case-insensitive)", () => {
    const pools = [makePool({ symbol: "steth", project: "LIDO" })];
    const result = findApyForToken("STETH", pools);
    expect(result).toMatchObject({ apy: 3.1, source: "defillama", project: "LIDO" });
  });

  it("prefers the highest-TVL candidate when several match", () => {
    const pools = [
      makePool({ pool: "a", tvlUsd: 500, apyBase: 1 }),
      makePool({ pool: "b", tvlUsd: 1_500, apyBase: 2 }),
      makePool({ pool: "c", tvlUsd: 900, apyBase: 5 }),
    ];
    const result = findApyForToken("STETH", pools);
    expect(result?.apy).toBe(2);
    expect(result?.poolId).toBe("b");
  });

  it("falls back to the composite apy field when apyBase is null", () => {
    const pools = [makePool({ apyBase: null, apy: 4.2 })];
    expect(findApyForToken("STETH", pools)?.apy).toBe(4.2);
  });

  it("returns null when apyBase and apy are both missing", () => {
    const pools = [makePool({ apyBase: null, apy: null })];
    expect(findApyForToken("STETH", pools)).toBeNull();
  });

  it("rejects pools on a different chain", () => {
    const pools = [makePool({ chain: "Arbitrum" })];
    expect(findApyForToken("STETH", pools)).toBeNull();
  });

  it("rejects pools with the wrong project slug", () => {
    const pools = [makePool({ project: "curve-dex" })];
    expect(findApyForToken("STETH", pools)).toBeNull();
  });

  it("rejects pools with a non-matching symbol", () => {
    const pools = [makePool({ symbol: "WSTETH" })];
    expect(findApyForToken("STETH", pools)).toBeNull();
  });

  it("returns null for symbols with no matcher", () => {
    const pools = [makePool({ project: "unknown", symbol: "UNKNOWN" })];
    expect(findApyForToken("UNKNOWN", pools)).toBeNull();
  });
});

describe("computeNetApy", () => {
  it("applies the fee discount to a positive gross APY", () => {
    expect(computeNetApy(5, 1300)).toBeCloseTo(4.35, 5);
    expect(computeNetApy(10, 0)).toBe(10);
  });

  it("accepts bigint fee inputs", () => {
    expect(computeNetApy(10, 1000n)).toBe(9);
  });

  it("treats null, undefined, non-finite, and zero-or-negative gross APY as no data", () => {
    expect(computeNetApy(null, 1000)).toBeNull();
    expect(computeNetApy(undefined, 1000)).toBeNull();
    expect(computeNetApy(Number.NaN, 1000)).toBeNull();
    expect(computeNetApy(Number.POSITIVE_INFINITY, 1000)).toBeNull();
    expect(computeNetApy(0, 1000)).toBeNull();
    expect(computeNetApy(-1, 1000)).toBeNull();
  });

  it("clamps fee factors above 100% to zero", () => {
    expect(computeNetApy(5, 15_000)).toBe(0);
  });
});

describe("findApyForToken — routing aliases", () => {
  it("routes SDAI through the SUSDS/sky-lending entry (Sky rebrand of the DSR)", () => {
    const pools = [
      makePool({ project: "sky-lending", symbol: "SUSDS", apyBase: null, apy: 3.7 }),
      makePool({ project: "aave-v3", symbol: "SDAI", apyBase: 0.1, apy: 0.1 }),
    ];
    const result = findApyForToken("SDAI", pools);
    expect(result).toMatchObject({ apy: 3.7, project: "sky-lending", symbol: "SUSDS" });
  });
});
