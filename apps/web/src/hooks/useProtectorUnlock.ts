import { useCallback, useState } from "react";
import { type Address } from "viem";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
import { POOL_ABI } from "../protocol/abi";
import { useOracleFreshness } from "./useOracleFreshness";
import { useProtocolWrite } from "./useProtocolWrite";

export function useProtectorUnlock() {
  const { writeContractAsync } = useProtocolWrite();
  const { ensureFreshPrices } = useOracleFreshness();
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);

  const invalidateCaches = async () => {
    await queryClient.invalidateQueries({ queryKey: ["user-positions"] });
    await queryClient.invalidateQueries({ queryKey: ["pool-detail"] });
    await queryClient.invalidateQueries({ queryKey: ["erc20-balance"] });
  };

  const startUnlock = useCallback(
    async (poolAddress: Address, tokenId: bigint) => {
      setIsProcessing(true);
      try {
        await writeContractAsync({
          address: poolAddress,
          abi: POOL_ABI,
          functionName: "startUnlockProcess",
          args: [tokenId],
        });
        await invalidateCaches();
        toast.success("Unlock process started");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to start unlock");
        throw error;
      } finally {
        setIsProcessing(false);
      }
    },
    [writeContractAsync, invalidateCaches],
  );

  const cancelUnlock = useCallback(
    async (poolAddress: Address, tokenId: bigint) => {
      setIsProcessing(true);
      try {
        await writeContractAsync({
          address: poolAddress,
          abi: POOL_ABI,
          functionName: "cancelUnlockProcess",
          args: [tokenId],
        });
        await invalidateCaches();
        toast.success("Unlock cancelled");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to cancel unlock");
        throw error;
      } finally {
        setIsProcessing(false);
      }
    },
    [writeContractAsync, invalidateCaches],
  );

  const withdrawProtector = useCallback(
    async (params: {
      poolAddress: Address;
      tokenId: bigint;
      amount: bigint;
      preferredAsset: Address;
      shieldedToken: Address;
      backingToken: Address;
      minAmountOut: bigint;
    }) => {
      setIsProcessing(true);
      try {
        await ensureFreshPrices([params.shieldedToken, params.backingToken]);
        await writeContractAsync({
          address: params.poolAddress,
          abi: POOL_ABI,
          functionName: "protectorWithdraw",
          args: [params.tokenId, params.amount, params.preferredAsset, params.minAmountOut],
        });
        await invalidateCaches();
        toast.success("Protector withdrawal successful!");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Withdrawal failed");
        throw error;
      } finally {
        setIsProcessing(false);
      }
    },
    [writeContractAsync, ensureFreshPrices, invalidateCaches],
  );

  return { startUnlock, cancelUnlock, withdrawProtector, isProcessing };
}
