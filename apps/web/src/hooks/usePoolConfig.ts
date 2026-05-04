import { useQuery } from "@tanstack/react-query";
import { type Address } from "viem";
import { POOL_ABI } from "../protocol/abi";
import { getProtocolReadClient } from "../protocol/networks";

export type PoolConfig = {
  shieldedMinDepositAmount: bigint;
  shieldedMaxDepositAmount: bigint;
  backingMinDepositAmount: bigint;
  backingMaxDepositAmount: bigint;
  maxTotalValueLockedUsd: bigint;
  minimumPoolTime: bigint;
  unlockDuration: bigint;
  protocolFeeRecipient: Address;
  protocolFee: bigint;
  priceOracle: Address;
};

export function usePoolConfig(poolAddress: Address | undefined, chainId: number) {
  const { data: config, isLoading } = useQuery({
    queryKey: ["pool-config", chainId, poolAddress],
    queryFn: async () => {
      const client = getProtocolReadClient(chainId);
      const result = await client.readContract({
        address: poolAddress!,
        abi: POOL_ABI,
        functionName: "poolConfig",
      });
      return result as unknown as PoolConfig;
    },
    enabled: !!poolAddress,
  });

  return { config, isLoading };
}
