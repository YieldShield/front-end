import { useCallback, useState } from "react";
import { type Address } from "viem";
import toast from "react-hot-toast";
import { useAccount } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import type { TransactionStep } from "../components/TransactionSteps";
import { FACTORY_ABI } from "../protocol/abi";
import { getProtocolReadClient } from "../protocol/networks";
import { parseCreatePoolSimulationError } from "../protocol/simulationErrors";
import { useProtocolChain } from "./useProtocolChain";
import { useProtocolWrite } from "./useProtocolWrite";

function makeSteps(currentStep: number, error: boolean): TransactionStep[] {
  const labels = ["Validate parameters", "Simulate creation", "Create pool"];
  return labels.map((label, i) => ({
    label,
    status: error && i === currentStep ? "error" : i < currentStep ? "done" : i === currentStep ? "active" : "pending",
  }));
}

export function useCreatePool() {
  const { activeProtocolChain } = useProtocolChain();
  const chainId = activeProtocolChain.id;
  const factoryAddress = activeProtocolChain.deployment.factory;
  const { address: userAddress } = useAccount();
  const { writeContractAsync } = useProtocolWrite();
  const queryClient = useQueryClient();

  const [isCreating, setIsCreating] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasError, setHasError] = useState(false);

  const steps = makeSteps(currentStep, hasError);

  const createPool = useCallback(
    async (params: {
      shieldedToken: Address;
      shieldedTokenSymbol: string;
      backingToken: Address;
      backingTokenSymbol: string;
      commissionRate: bigint;
      poolFee: bigint;
      collateralRatio: bigint;
    }): Promise<Address | null> => {
      if (!userAddress) throw new Error("Wallet not connected");

      setIsCreating(true);
      setHasError(false);
      setCurrentStep(0);

      const args = [
        params.shieldedToken,
        params.shieldedTokenSymbol,
        params.backingToken,
        params.backingTokenSymbol,
        params.commissionRate,
        params.poolFee,
        params.collateralRatio,
      ] as const;

      try {
        if (params.shieldedToken === params.backingToken) {
          throw new Error("Shielded and backing tokens must be different");
        }

        // Step 1: Simulate so contract reverts surface as readable messages
        // before MetaMask's gas estimator can produce nonsense.
        setCurrentStep(1);
        const client = getProtocolReadClient(chainId);
        try {
          await client.simulateContract({
            address: factoryAddress,
            abi: FACTORY_ABI,
            functionName: "createPool",
            args,
            account: userAddress,
          });
        } catch (simError) {
          throw new Error(parseCreatePoolSimulationError(simError));
        }

        // Step 2: Submit
        setCurrentStep(2);
        const result = await writeContractAsync({
          address: factoryAddress,
          abi: FACTORY_ABI,
          functionName: "createPool",
          args,
        });

        await queryClient.invalidateQueries({ queryKey: ["pools"] });
        await queryClient.invalidateQueries({ queryKey: ["dapp-pools"] });

        toast.success("Pool created!");
        return result as Address;
      } catch (error) {
        setHasError(true);
        toast.error(error instanceof Error ? error.message : "Pool creation failed");
        throw error;
      } finally {
        setIsCreating(false);
      }
    },
    [chainId, factoryAddress, userAddress, writeContractAsync, queryClient],
  );

  return { createPool, isCreating, steps };
}
