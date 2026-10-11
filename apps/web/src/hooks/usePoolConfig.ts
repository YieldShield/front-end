import { useQuery } from "@tanstack/react-query";
import { type Address } from "viem";
import { POOL_ABI } from "../protocol/abi";
import { LEGACY_POOL_ABI } from "../protocol/legacy-abi";
import { getProtocolChainById, getProtocolReadClient } from "../protocol/networks";

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
      if (getProtocolChainById(chainId).contractVersion === "legacy-s1") {
        return (await client.readContract({
          address: poolAddress!,
          abi: LEGACY_POOL_ABI,
          functionName: "poolConfig",
        })) as PoolConfig;
      }
      const result = await client.readContract({
        address: poolAddress!,
        abi: POOL_ABI,
        functionName: "poolConfig",
      });
      const [
        shieldedMinDepositAmount,
        shieldedMaxDepositAmount,
        backingMinDepositAmount,
        backingMaxDepositAmount,
        maxTotalValueLockedUsd,
        minimumPoolTime,
        unlockDuration,
        protocolFeeRecipient,
        protocolFee,
        priceOracle,
      ] = result;
      return {
        shieldedMinDepositAmount,
        shieldedMaxDepositAmount,
        backingMinDepositAmount,
        backingMaxDepositAmount,
        maxTotalValueLockedUsd,
        minimumPoolTime,
        unlockDuration,
        protocolFeeRecipient,
        protocolFee,
        priceOracle,
      } satisfies PoolConfig;
    },
    enabled: !!poolAddress,
  });

  return { config, isLoading };
}
