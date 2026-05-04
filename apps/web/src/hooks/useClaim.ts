import { useCallback, useState } from "react";
import { type Address } from "viem";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
import { POOL_ABI } from "../protocol/abi";
import { useProtocolWrite } from "./useProtocolWrite";

export function useClaim() {
  const { writeContractAsync } = useProtocolWrite();
  const queryClient = useQueryClient();
  const [isClaiming, setIsClaiming] = useState(false);

  const invalidateCaches = async () => {
    await queryClient.invalidateQueries({ queryKey: ["user-positions"] });
    await queryClient.invalidateQueries({ queryKey: ["erc20-balance"] });
    await queryClient.invalidateQueries({ queryKey: ["pool-detail"] });
  };

  const claimRewards = useCallback(
    async (poolAddress: Address, tokenId: bigint) => {
      setIsClaiming(true);
      try {
        await writeContractAsync({
          address: poolAddress,
          abi: POOL_ABI,
          functionName: "claimRewards",
          args: [tokenId],
        });
        await invalidateCaches();
        toast.success("Yield fees claimed!");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Claim failed");
        throw error;
      } finally {
        setIsClaiming(false);
      }
    },
    [writeContractAsync, invalidateCaches],
  );

  const claimCommission = useCallback(
    async (poolAddress: Address, tokenId: bigint) => {
      setIsClaiming(true);
      try {
        await writeContractAsync({
          address: poolAddress,
          abi: POOL_ABI,
          functionName: "claimCommission",
          args: [tokenId],
        });
        await invalidateCaches();
        toast.success("Commission claimed!");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Claim failed");
        throw error;
      } finally {
        setIsClaiming(false);
      }
    },
    [writeContractAsync, invalidateCaches],
  );

  return { claimRewards, claimCommission, isClaiming };
}
