import { useQuery } from "@tanstack/react-query";
import { type Address } from "viem";
import { fetchUserPositions } from "../protocol/positions";
import { useProtocolChain } from "./useProtocolChain";

export function useUserPositions(userAddress: Address | undefined) {
  const { activeProtocolChain } = useProtocolChain();
  const chainId = activeProtocolChain.id;

  const { data: positions, isLoading, error, refetch } = useQuery({
    queryKey: ["user-positions", chainId, userAddress],
    queryFn: () => fetchUserPositions(chainId, userAddress!),
    enabled: !!userAddress,
  });

  return { positions, isLoading, error: error instanceof Error ? error : null, refetch };
}
