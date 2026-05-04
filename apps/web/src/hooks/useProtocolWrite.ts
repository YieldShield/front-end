import { useCallback } from "react";
import { useChainId, useWriteContract } from "wagmi";
import { getWriteFeeOverrides } from "../protocol/fees";

type WriteContract = ReturnType<typeof useWriteContract>["writeContract"];
type WriteContractAsync = ReturnType<typeof useWriteContract>["writeContractAsync"];

// Drop-in replacement for wagmi's useWriteContract that injects chain-specific
// gas fee overrides (see protocol/fees.ts) before delegating. Call sites keep
// their typed config; overrides are merged in as defaults.
export function useProtocolWrite() {
  const chainId = useChainId();
  const wagmi = useWriteContract();
  const { writeContract: wagmiWrite, writeContractAsync: wagmiWriteAsync } = wagmi;

  const writeContractAsync: WriteContractAsync = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (config: any, options: any) =>
      wagmiWriteAsync({ ...getWriteFeeOverrides(chainId), ...config }, options),
    [wagmiWriteAsync, chainId],
  ) as WriteContractAsync;

  const writeContract: WriteContract = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (config: any, options: any) =>
      wagmiWrite({ ...getWriteFeeOverrides(chainId), ...config }, options),
    [wagmiWrite, chainId],
  ) as WriteContract;

  return { ...wagmi, writeContract, writeContractAsync };
}
