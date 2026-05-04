import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchDefiLlamaPools, findApyForToken, isTokenYieldSupported, type TokenYield } from "../protocol/yields";

const STALE_TIME_MS = 10 * 60 * 1000;
const GC_TIME_MS = 60 * 60 * 1000;

function useDefiLlamaPools() {
  return useQuery({
    queryKey: ["defillama-yields-pools"],
    queryFn: ({ signal }) => fetchDefiLlamaPools(signal),
    staleTime: STALE_TIME_MS,
    gcTime: GC_TIME_MS,
    retry: 1,
  });
}

export type PoolYieldResult = {
  yield: TokenYield | null;
  isSupported: boolean;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
};

export function usePoolYield(tokenSymbol: string | undefined): PoolYieldResult {
  const supported = Boolean(tokenSymbol && isTokenYieldSupported(tokenSymbol));
  const { data, isLoading, isError, error } = useDefiLlamaPools();

  const resolved = useMemo(() => {
    if (!supported || !tokenSymbol || !data) return null;
    return findApyForToken(tokenSymbol, data);
  }, [supported, tokenSymbol, data]);

  return {
    yield: resolved,
    isSupported: supported,
    isLoading: supported && isLoading,
    isError: supported && isError,
    error,
  };
}

export function usePoolYields(tokenSymbols: (string | undefined)[]) {
  const { data, isLoading, isError, error } = useDefiLlamaPools();

  const resolved = useMemo(() => {
    const map = new Map<string, TokenYield | null>();
    if (!data) return map;
    for (const symbol of tokenSymbols) {
      if (!symbol) continue;
      const key = symbol.toLowerCase();
      if (map.has(key)) continue;
      map.set(key, isTokenYieldSupported(symbol) ? findApyForToken(symbol, data) : null);
    }
    return map;
  }, [data, tokenSymbols]);

  return {
    yieldsBySymbol: resolved,
    isLoading,
    isError,
    error,
  };
}
