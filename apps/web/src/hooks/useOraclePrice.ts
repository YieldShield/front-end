import { useQuery } from "@tanstack/react-query";
import { type Address } from "viem";
import { fetchTokenPrice } from "../protocol/oracle";
import { useProtocolChain } from "./useProtocolChain";

const ORACLE_PRICE_DECIMALS = 8;
const REFETCH_INTERVAL_MS = 30_000;

export function useOraclePrice(tokenAddress: Address | undefined) {
  const { activeProtocolChain } = useProtocolChain();
  const chainId = activeProtocolChain.id;

  const { data: price, isLoading } = useQuery({
    queryKey: ["oracle-price", chainId, tokenAddress],
    queryFn: async () => {
      const raw = await fetchTokenPrice(chainId, tokenAddress!);
      return Number(raw) / 10 ** ORACLE_PRICE_DECIMALS;
    },
    enabled: !!tokenAddress,
    refetchInterval: REFETCH_INTERVAL_MS,
  });

  return { price: price ?? null, isLoading };
}
