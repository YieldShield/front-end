import { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { type Address } from "viem";
import { useWaitForTransactionReceipt } from "wagmi";
import { ERC20_ABI } from "../protocol/abi";
import { getProtocolReadClient } from "../protocol/networks";
import { useProtocolWrite } from "./useProtocolWrite";

export function useErc20Approval(params: {
  tokenAddress: Address | undefined;
  spenderAddress: Address | undefined;
  amount: bigint;
  ownerAddress: Address | undefined;
  chainId: number;
}) {
  const { tokenAddress, spenderAddress, amount, ownerAddress, chainId } = params;
  const queryClient = useQueryClient();
  const [approvalTxHash, setApprovalTxHash] = useState<Address | undefined>();

  const allowanceQueryKey = ["erc20-allowance", chainId, tokenAddress, ownerAddress, spenderAddress];

  const { data: allowance, isLoading: isCheckingAllowance } = useQuery({
    queryKey: allowanceQueryKey,
    queryFn: async () => {
      const client = getProtocolReadClient(chainId);
      return (await client.readContract({
        address: tokenAddress!,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: [ownerAddress!, spenderAddress!],
      })) as bigint;
    },
    enabled: !!tokenAddress && !!ownerAddress && !!spenderAddress,
  });

  const needsApproval = allowance !== undefined && allowance < amount;

  const { writeContractAsync } = useProtocolWrite();

  const { isLoading: isWaitingForReceipt } = useWaitForTransactionReceipt({
    hash: approvalTxHash,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const isApproving = isSubmitting || isWaitingForReceipt;

  const approve = useCallback(async () => {
    if (!tokenAddress || !spenderAddress) return;
    setIsSubmitting(true);
    try {
      const hash = await writeContractAsync({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [spenderAddress, amount],
      });
      setApprovalTxHash(hash);
      await queryClient.invalidateQueries({ queryKey: allowanceQueryKey });
    } finally {
      setIsSubmitting(false);
    }
  }, [tokenAddress, spenderAddress, amount, writeContractAsync, queryClient, allowanceQueryKey]);

  return { allowance, needsApproval, isCheckingAllowance, approve, isApproving };
}
