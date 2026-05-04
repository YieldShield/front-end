import { arbitrumSepolia } from "viem/chains";

type FeeOverrides = {
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
};

// Arbitrum Sepolia's base fee floats around 0.01 gwei but can briefly exceed
// the ~0.02 gwei that wallet estimators cache, causing
// "max fee per gas less than block base fee" rejections. Override with a
// safe ceiling that's still fractions of a cent.
export function getWriteFeeOverrides(chainId: number | undefined): FeeOverrides {
  if (chainId === arbitrumSepolia.id) {
    return {
      maxFeePerGas: 100_000_000n, // 0.1 gwei
      maxPriorityFeePerGas: 10_000_000n, // 0.01 gwei
    };
  }
  return {};
}
