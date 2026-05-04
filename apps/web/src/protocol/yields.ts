const DEFILLAMA_YIELDS_URL = "https://yields.llama.fi/pools";

export type LlamaPool = {
  chain: string;
  project: string;
  symbol: string;
  apyBase: number | null;
  apy: number | null;
  tvlUsd: number;
  pool: string;
};

type LlamaPoolsResponse = {
  status?: string;
  data?: LlamaPool[];
};

export type TokenYield = {
  apy: number;
  source: "defillama";
  project: string;
  symbol: string;
  tvlUsd: number;
  poolId: string;
};

type TokenMatcher = {
  chain: string;
  projects: string[];
  symbol: string;
};

// Each entry maps a YieldShield shielded-token symbol (as returned by `getPoolInfo`)
// to the DeFiLlama mainnet pool it is modeling. The testnet tokens on Arbitrum Sepolia
// are standins; the yield shown is the reference mainnet yield of the same asset.
const TOKEN_MATCHERS: Record<string, TokenMatcher> = {
  susde: { chain: "Ethereum", projects: ["ethena-usde"], symbol: "SUSDE" },
  // DeFiLlama retired the sDAI DSR entry when Sky rebranded; the same savings rate
  // is now surfaced as SUSDS on sky-lending.
  sdai: { chain: "Ethereum", projects: ["sky-lending"], symbol: "SUSDS" },
  steth: { chain: "Ethereum", projects: ["lido"], symbol: "STETH" },
  rlp: { chain: "Ethereum", projects: ["resolv"], symbol: "RLP" },
  usdy: { chain: "Ethereum", projects: ["ondo-yield-assets"], symbol: "USDY" },
  gtusdc: { chain: "Ethereum", projects: ["morpho-blue"], symbol: "GTUSDC" },
};

function normalize(value: string) {
  return value.trim().toLowerCase();
}

export function isTokenYieldSupported(tokenSymbol: string) {
  return normalize(tokenSymbol) in TOKEN_MATCHERS;
}

export async function fetchDefiLlamaPools(signal?: AbortSignal): Promise<LlamaPool[]> {
  const response = await fetch(DEFILLAMA_YIELDS_URL, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal,
  });

  if (!response.ok) {
    throw new Error(`DeFiLlama yields fetch failed: ${response.status} ${response.statusText}`);
  }

  const json = (await response.json()) as LlamaPoolsResponse;
  if (!Array.isArray(json.data)) {
    throw new Error("DeFiLlama yields response missing data array");
  }

  return json.data;
}

export function computeNetApy(
  grossApy: number | null | undefined,
  totalFeeBps: bigint | number,
): number | null {
  if (grossApy === null || grossApy === undefined) return null;
  if (!Number.isFinite(grossApy) || grossApy <= 0) return null;

  const bps = typeof totalFeeBps === "bigint" ? Number(totalFeeBps) : totalFeeBps;
  const feeFactor = Math.max(1 - bps / 10_000, 0);
  return grossApy * feeFactor;
}

export function findApyForToken(tokenSymbol: string, pools: LlamaPool[]): TokenYield | null {
  const matcher = TOKEN_MATCHERS[normalize(tokenSymbol)];
  if (!matcher) {
    return null;
  }

  const targetChain = normalize(matcher.chain);
  const targetProjects = new Set(matcher.projects.map(normalize));
  const targetSymbol = normalize(matcher.symbol);

  const candidates = pools.filter(
    pool =>
      normalize(pool.chain) === targetChain &&
      targetProjects.has(normalize(pool.project)) &&
      normalize(pool.symbol) === targetSymbol,
  );

  if (candidates.length === 0) {
    return null;
  }

  const best = candidates.reduce((winner, candidate) =>
    candidate.tvlUsd > winner.tvlUsd ? candidate : winner,
  );

  const apy = best.apyBase ?? best.apy;
  if (apy === null || apy === undefined || Number.isNaN(apy)) {
    return null;
  }

  return {
    apy,
    source: "defillama",
    project: best.project,
    symbol: best.symbol,
    tvlUsd: best.tvlUsd,
    poolId: best.pool,
  };
}
