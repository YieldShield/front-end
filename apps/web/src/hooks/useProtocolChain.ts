import { useMemo } from "react";
import { useAccount, useChainId } from "wagmi";
import { getDefaultProtocolChain, getProtocolChainById, isSupportedProtocolChainId } from "../protocol/networks";

export function useProtocolChain() {
  const chainId = useChainId();
  const { isConnected } = useAccount();

  return useMemo(() => {
    if (isConnected && isSupportedProtocolChainId(chainId)) {
      const activeProtocolChain = getProtocolChainById(chainId);
      return {
        activeProtocolChain,
        source: "wallet" as const,
        sourceLabel: "Following the connected wallet network.",
      };
    }

    const activeProtocolChain = getDefaultProtocolChain();
    return {
      activeProtocolChain,
      source: "default" as const,
      sourceLabel: "Using the repository default chain because no supported wallet network is active.",
    };
  }, [chainId, isConnected]);
}
