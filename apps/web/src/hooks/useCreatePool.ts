import { useCallback, useState } from "react";
import { parseUnits, type Address } from "viem";
import toast from "react-hot-toast";
import { useAccount } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import type { TransactionStep } from "../components/TransactionSteps";
import { ERC20_ABI, ERC20_METADATA_ABI, FACTORY_ABI, ORACLE_ABI } from "../protocol/abi";
import { LEGACY_FACTORY_ABI } from "../protocol/legacy-abi";
import { getProtocolReadClient } from "../protocol/networks";
import { parseCreatePoolSimulationError } from "../protocol/simulationErrors";
import { useProtocolChain } from "./useProtocolChain";
import { useProtocolWrite } from "./useProtocolWrite";

function makeSteps(
  currentStep: number,
  error: boolean,
  currentContracts: boolean,
): TransactionStep[] {
  const labels = currentContracts
    ? ["Validate bond", "Approve bond", "Simulate creation", "Create pool"]
    : ["Validate parameters", "Simulate creation", "Create pool"];
  return labels.map((label, i) => ({
    label,
    status:
      error && i === currentStep
        ? "error"
        : i < currentStep
          ? "done"
          : i === currentStep
            ? "active"
            : "pending",
  }));
}

export function useCreatePool() {
  const { activeProtocolChain } = useProtocolChain();
  const chainId = activeProtocolChain.id;
  const currentContracts = activeProtocolChain.contractVersion === "current";
  const factoryAddress = activeProtocolChain.deployment.factory;
  const { address: userAddress } = useAccount();
  const { writeContractAsync } = useProtocolWrite();
  const queryClient = useQueryClient();

  const [isCreating, setIsCreating] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasError, setHasError] = useState(false);

  const steps = makeSteps(currentStep, hasError, currentContracts);

  const createPool = useCallback(
    async (params: {
      shieldedToken: Address;
      shieldedTokenSymbol: string;
      backingToken: Address;
      backingTokenSymbol: string;
      commissionRate: bigint;
      poolFee: bigint;
      collateralRatio: bigint;
      creationBondAmount: string;
    }): Promise<Address | null> => {
      if (!userAddress) throw new Error("Wallet not connected");

      setIsCreating(true);
      setHasError(false);
      setCurrentStep(0);

      try {
        if (params.shieldedToken === params.backingToken) {
          throw new Error("Shielded and backing tokens must be different");
        }

        const client = getProtocolReadClient(chainId);
        if (!currentContracts) {
          const args = [
            params.shieldedToken,
            params.shieldedTokenSymbol,
            params.backingToken,
            params.backingTokenSymbol,
            params.commissionRate,
            params.poolFee,
            params.collateralRatio,
          ] as const;
          setCurrentStep(1);
          try {
            await client.simulateContract({
              address: factoryAddress,
              abi: LEGACY_FACTORY_ABI,
              functionName: "createPool",
              args,
              account: userAddress,
            });
          } catch (simError) {
            throw new Error(parseCreatePoolSimulationError(simError));
          }
          setCurrentStep(2);
          const hash = await writeContractAsync({
            address: factoryAddress,
            abi: LEGACY_FACTORY_ABI,
            functionName: "createPool",
            args,
          });
          const receipt = await client.waitForTransactionReceipt({ hash });
          if (receipt.status !== "success") throw new Error("Pool creation failed");
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: ["pools"] }),
            queryClient.invalidateQueries({ queryKey: ["dapp-pools"] }),
          ]);
          toast.success("Pool created!");
          return hash as Address;
        }
        const [decimals, minimumBondUsd, oracle, balance, allowance] = await Promise.all([
          client.readContract({
            address: params.backingToken,
            abi: ERC20_METADATA_ABI,
            functionName: "decimals",
          }),
          client.readContract({
            address: factoryAddress,
            abi: FACTORY_ABI,
            functionName: "minimumCreationBondUsd",
          }),
          client.readContract({
            address: factoryAddress,
            abi: FACTORY_ABI,
            functionName: "compositeOracle",
          }),
          client.readContract({
            address: params.backingToken,
            abi: ERC20_ABI,
            functionName: "balanceOf",
            args: [userAddress],
          }),
          client.readContract({
            address: params.backingToken,
            abi: ERC20_ABI,
            functionName: "allowance",
            args: [userAddress, factoryAddress],
          }),
        ]);
        if (!/^\d+(\.\d+)?$/.test(params.creationBondAmount))
          throw new Error("Enter a valid creation bond amount");
        if ((params.creationBondAmount.split(".")[1]?.length ?? 0) > decimals)
          throw new Error("Creation bond has too many decimal places");
        const bond = parseUnits(params.creationBondAmount, decimals);
        if (balance < bond) throw new Error("Insufficient backing tokens for the creation bond");
        const bondUsd =
          bond === 0n
            ? 0n
            : await client.readContract({
                address: oracle,
                abi: ORACLE_ABI,
                functionName: "getValue",
                args: [params.backingToken, bond],
              });
        if (bondUsd < minimumBondUsd)
          throw new Error("Creation bond is below the factory's required USD value");

        setCurrentStep(1);
        if (allowance < bond) {
          // Tokens such as USDT require clearing an existing allowance first.
          for (const amount of allowance > 0n ? [0n, bond] : [bond]) {
            const hash = await writeContractAsync({
              address: params.backingToken,
              abi: ERC20_ABI,
              functionName: "approve",
              args: [factoryAddress, amount],
            });
            const receipt = await client.waitForTransactionReceipt({ hash });
            if (receipt.status !== "success") throw new Error("Creation bond approval failed");
          }
        }
        const args = [
          params.shieldedToken,
          params.shieldedTokenSymbol,
          params.backingToken,
          params.backingTokenSymbol,
          params.commissionRate,
          params.poolFee,
          params.collateralRatio,
          bond,
        ] as const;
        setCurrentStep(2);
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

        // Submit after the bond approval is mined.
        setCurrentStep(3);
        const result = await writeContractAsync({
          address: factoryAddress,
          abi: FACTORY_ABI,
          functionName: "createPool",
          args,
        });

        const receipt = await client.waitForTransactionReceipt({ hash: result });
        if (receipt.status !== "success") throw new Error("Pool creation failed");
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["pools"] }),
          queryClient.invalidateQueries({ queryKey: ["dapp-pools"] }),
        ]);

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
    [chainId, currentContracts, factoryAddress, userAddress, writeContractAsync, queryClient],
  );

  return { createPool, isCreating, steps };
}
