import { useQuery } from "@tanstack/react-query";
import { type Address } from "viem";
import { ERC20_ABI } from "../protocol/abi";
import { getProtocolReadClient } from "../protocol/networks";

export function useErc20Balance(params: {
  tokenAddress: Address | undefined;
  accountAddress: Address | undefined;
  chainId: number;
}) {
  const { tokenAddress, accountAddress, chainId } = params;

  const { data: balance, isLoading } = useQuery({
    queryKey: ["erc20-balance", chainId, tokenAddress, accountAddress],
    queryFn: async () => {
      const client = getProtocolReadClient(chainId);
      return (await client.readContract({
        address: tokenAddress!,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [accountAddress!],
      })) as bigint;
    },
    enabled: !!tokenAddress && !!accountAddress,
  });

  return { balance, isLoading };
}
