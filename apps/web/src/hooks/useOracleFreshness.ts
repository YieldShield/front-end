import { useCallback, useState } from "react";
import { type Address, type Hex } from "viem";
import toast from "react-hot-toast";
import { PYTH_ORACLE_ABI } from "../protocol/abi";
import { getProtocolReadClient } from "../protocol/networks";
import { useProtocolChain } from "./useProtocolChain";
import { useProtocolWrite } from "./useProtocolWrite";
import {
  checkPriceStaleness,
  expandTokensWithUnderlyings,
  fetchPriceUpdateData,
  fetchPythFeedId,
  fetchUpdateFee,
} from "../protocol/oracle";

const ZERO_FEED_ID = "0x0000000000000000000000000000000000000000000000000000000000000000";

export function useOracleFreshness() {
  const { activeProtocolChain } = useProtocolChain();
  const chainId = activeProtocolChain.id;
  const deployment = activeProtocolChain.deployment as Record<string, Address | undefined>;
  const pythOracle = deployment.pythOracle;

  const { writeContractAsync } = useProtocolWrite();
  const [isUpdating, setIsUpdating] = useState(false);

  const ensureFreshPrices = useCallback(
    async (tokens: Address[]) => {
      if (!pythOracle || tokens.length === 0) return;

      // Vault tokens like gtUSDC don't have direct Pyth feeds; the composite
      // oracle prices them via their ERC4626 underlying (e.g., USDC). Expand
      // the input list so the underlying's Pyth feed is what we check and
      // refresh — otherwise the pool's price read still reverts.
      const expanded = await expandTokensWithUnderlyings(chainId, tokens);

      const staleTokens: Address[] = [];
      for (const token of expanded) {
        try {
          const { isStale } = await checkPriceStaleness(chainId, token);
          if (isStale) staleTokens.push(token);
        } catch {
          // Tokens without a direct Pyth feed (vault tokens) revert here —
          // safe to skip; their underlying is already in `expanded`.
        }
      }

      if (staleTokens.length === 0) return;

      setIsUpdating(true);
      const toastId = toast.loading("Updating oracle prices...");

      try {
        const feedIds: Hex[] = [];
        for (const token of staleTokens) {
          const feedId = await fetchPythFeedId(chainId, token);
          if (feedId && feedId !== ZERO_FEED_ID) feedIds.push(feedId);
        }

        if (feedIds.length === 0) {
          toast.dismiss(toastId);
          return;
        }

        const uniqueFeedIds = [...new Set(feedIds)];
        const updateData = await fetchPriceUpdateData(chainId, uniqueFeedIds);
        const fee = await fetchUpdateFee(chainId, updateData);

        const txHash = await writeContractAsync({
          address: pythOracle,
          abi: PYTH_ORACLE_ABI,
          functionName: "updatePriceFeeds",
          args: [updateData],
          value: fee,
        });

        // Wait for receipt before returning so the deposit simulation that
        // runs next sees the updated on-chain prices instead of racing them.
        const client = getProtocolReadClient(chainId);
        await client.waitForTransactionReceipt({ hash: txHash, pollingInterval: 1_000 });

        toast.success("Oracle prices updated", { id: toastId });
      } catch (error) {
        // Don't silently swallow — if the price update fails, the deposit
        // simulation right after will revert with InvalidOraclePrice and the
        // user gets no actionable info. Re-throw so the caller's error
        // handler surfaces the real cause (e.g., Hermes 404, user rejection).
        const message = error instanceof Error ? error.message : "Oracle price update failed";
        toast.error(message, { id: toastId });
        console.error("Oracle price update failed:", error);
        throw new Error(`Oracle price update failed: ${message}`);
      } finally {
        setIsUpdating(false);
      }
    },
    [chainId, pythOracle, writeContractAsync],
  );

  return { ensureFreshPrices, isUpdating };
}
