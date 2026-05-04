import { useCallback, useState } from "react";
import { type Address } from "viem";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
import type { TransactionStep } from "../components/TransactionSteps";
import { POOL_ABI } from "../protocol/abi";
import { useOracleFreshness } from "./useOracleFreshness";
import { useProtocolWrite } from "./useProtocolWrite";

function makeSteps(currentStep: number, error: boolean): TransactionStep[] {
  const labels = ["Update oracle prices", "Submit withdrawal"];
  return labels.map((label, i) => ({
    label,
    status: error && i === currentStep ? "error" : i < currentStep ? "done" : i === currentStep ? "active" : "pending",
  }));
}

export function useWithdraw() {
  const { writeContractAsync } = useProtocolWrite();
  const { ensureFreshPrices } = useOracleFreshness();
  const queryClient = useQueryClient();

  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasError, setHasError] = useState(false);

  const steps = makeSteps(currentStep, hasError);

  const invalidateCaches = async () => {
    await queryClient.invalidateQueries({ queryKey: ["pools"] });
    await queryClient.invalidateQueries({ queryKey: ["pool-detail"] });
    await queryClient.invalidateQueries({ queryKey: ["user-positions"] });
    await queryClient.invalidateQueries({ queryKey: ["erc20-balance"] });
  };

  const withdrawFull = useCallback(
    async (params: {
      poolAddress: Address;
      tokenId: bigint;
      preferredAsset: Address;
      shieldedToken: Address;
      backingToken: Address;
      minAmountOut: bigint;
    }) => {
      setIsWithdrawing(true);
      setHasError(false);
      setCurrentStep(0);

      try {
        await ensureFreshPrices([params.shieldedToken, params.backingToken]);

        setCurrentStep(1);
        await writeContractAsync({
          address: params.poolAddress,
          abi: POOL_ABI,
          functionName: "shieldedWithdraw",
          args: [params.tokenId, params.preferredAsset, params.minAmountOut],
        });

        await invalidateCaches();
        toast.success("Withdrawal successful!");
      } catch (error) {
        setHasError(true);
        toast.error(error instanceof Error ? error.message : "Withdrawal failed");
        throw error;
      } finally {
        setIsWithdrawing(false);
      }
    },
    [writeContractAsync, ensureFreshPrices, invalidateCaches],
  );

  const withdrawPartial = useCallback(
    async (params: {
      poolAddress: Address;
      tokenId: bigint;
      amount: bigint;
      preferredAsset: Address;
      shieldedToken: Address;
      backingToken: Address;
      minAmountOut: bigint;
    }) => {
      setIsWithdrawing(true);
      setHasError(false);
      setCurrentStep(0);

      try {
        await ensureFreshPrices([params.shieldedToken, params.backingToken]);

        setCurrentStep(1);
        await writeContractAsync({
          address: params.poolAddress,
          abi: POOL_ABI,
          functionName: "partialWithdrawShielded",
          args: [params.tokenId, params.amount, params.preferredAsset, params.minAmountOut],
        });

        await invalidateCaches();
        toast.success("Partial withdrawal successful!");
      } catch (error) {
        setHasError(true);
        toast.error(error instanceof Error ? error.message : "Withdrawal failed");
        throw error;
      } finally {
        setIsWithdrawing(false);
      }
    },
    [writeContractAsync, ensureFreshPrices, invalidateCaches],
  );

  return { withdrawFull, withdrawPartial, isWithdrawing, steps };
}
