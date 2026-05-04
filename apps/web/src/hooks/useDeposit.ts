import { useCallback, useState } from "react";
import { type Address } from "viem";
import toast from "react-hot-toast";
import { useAccount } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import type { TransactionStep } from "../components/TransactionSteps";
import { POOL_ABI, ERC20_ABI } from "../protocol/abi";
import { getProtocolReadClient } from "../protocol/networks";
import { parseDepositSimulationError } from "../protocol/simulationErrors";
import { useOracleFreshness } from "./useOracleFreshness";
import { useProtocolChain } from "./useProtocolChain";
import { useProtocolWrite } from "./useProtocolWrite";

function makeSteps(currentStep: number, error: boolean): TransactionStep[] {
  const labels = ["Check balance", "Update oracle prices", "Approve token", "Simulate deposit", "Submit deposit"];
  return labels.map((label, i) => ({
    label,
    status: error && i === currentStep ? "error" : i < currentStep ? "done" : i === currentStep ? "active" : "pending",
  }));
}

export function useDeposit() {
  const { activeProtocolChain } = useProtocolChain();
  const chainId = activeProtocolChain.id;
  const { address: userAddress } = useAccount();
  const { writeContractAsync } = useProtocolWrite();
  const { ensureFreshPrices } = useOracleFreshness();
  const queryClient = useQueryClient();

  const [isDepositing, setIsDepositing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasError, setHasError] = useState(false);

  const steps = makeSteps(currentStep, hasError);

  const executeDeposit = useCallback(
    async (params: {
      poolAddress: Address;
      asset: Address;
      shieldedToken: Address;
      backingToken: Address;
      amount: bigint;
      minReceived: bigint;
      functionName: "depositShieldedAsset" | "depositBackingAsset";
    }) => {
      if (!userAddress) throw new Error("Wallet not connected");

      setIsDepositing(true);
      setHasError(false);
      setCurrentStep(0);

      try {
        // Step 0: Check balance
        const client = getProtocolReadClient(chainId);
        const balance = (await client.readContract({
          address: params.asset,
          abi: ERC20_ABI,
          functionName: "balanceOf",
          args: [userAddress],
        })) as bigint;

        if (balance < params.amount) {
          throw new Error("Insufficient token balance");
        }

        // Step 1: Oracle freshness — refresh BOTH tokens. depositShieldedAsset
        // reads the backing price for the collateral calc, and depositBackingAsset
        // touches the shielded price during the TVL check.
        setCurrentStep(1);
        await ensureFreshPrices([params.shieldedToken, params.backingToken]);

        // Step 2: Approve if needed
        setCurrentStep(2);
        const allowance = (await client.readContract({
          address: params.asset,
          abi: ERC20_ABI,
          functionName: "allowance",
          args: [userAddress, params.poolAddress],
        })) as bigint;

        if (allowance < params.amount) {
          await writeContractAsync({
            address: params.asset,
            abi: ERC20_ABI,
            functionName: "approve",
            args: [params.poolAddress, params.amount],
          });
        }

        // Step 3: Simulate — surface contract reverts with friendly messages
        // before asking the wallet to sign anything.
        setCurrentStep(3);
        try {
          await client.simulateContract({
            address: params.poolAddress,
            abi: POOL_ABI,
            functionName: params.functionName,
            args: [params.asset, params.amount, params.minReceived],
            account: userAddress,
          });
        } catch (simError) {
          throw new Error(parseDepositSimulationError(simError));
        }

        // Step 4: Deposit
        setCurrentStep(4);
        await writeContractAsync({
          address: params.poolAddress,
          abi: POOL_ABI,
          functionName: params.functionName,
          args: [params.asset, params.amount, params.minReceived],
        });

        // Invalidate caches
        await queryClient.invalidateQueries({ queryKey: ["pools"] });
        await queryClient.invalidateQueries({ queryKey: ["pool-detail"] });
        await queryClient.invalidateQueries({ queryKey: ["user-positions"] });
        await queryClient.invalidateQueries({ queryKey: ["erc20-balance"] });

        toast.success("Deposit successful!");
      } catch (error) {
        setHasError(true);
        const message = error instanceof Error ? error.message : "Deposit failed";
        toast.error(message);
        throw error;
      } finally {
        setIsDepositing(false);
      }
    },
    [chainId, userAddress, writeContractAsync, ensureFreshPrices, queryClient],
  );

  const depositShielded = useCallback(
    (params: {
      poolAddress: Address;
      asset: Address;
      shieldedToken: Address;
      backingToken: Address;
      amount: bigint;
      minReceived: bigint;
    }) => executeDeposit({ ...params, functionName: "depositShieldedAsset" }),
    [executeDeposit],
  );

  const depositBacking = useCallback(
    (params: {
      poolAddress: Address;
      asset: Address;
      shieldedToken: Address;
      backingToken: Address;
      amount: bigint;
      minReceived: bigint;
    }) => executeDeposit({ ...params, functionName: "depositBackingAsset" }),
    [executeDeposit],
  );

  return { depositShielded, depositBacking, isDepositing, steps, currentStep };
}
