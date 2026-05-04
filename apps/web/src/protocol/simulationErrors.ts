import { BaseError, ContractFunctionRevertedError } from "viem";

const DEPOSIT_ERROR_MESSAGES: Record<string, string> = {
  InsufficientDepositAmount: "Deposit amount is too small. Please increase the amount.",
  DepositAmountTooLarge: "Deposit amount is too large. Please reduce the amount.",
  UnsupportedAsset: "This asset is not supported by the pool.",
  TVLLimitExceeded: "Pool has reached its maximum total value locked.",
  TransferOperationFailed: "Token transfer failed. Check your balance and allowance.",
  InsufficientProtectorTokenBalance:
    "The pool doesn't have enough unlocked backing tokens to cover this deposit. Try a smaller amount.",
  InsufficientTokenBalance: "Insufficient token balance.",
  EnforcedPause: "Pool is currently paused. Deposits are disabled.",
  SlippageProtectionFailed: "Slippage protection failed — received less than the minimum. Try again.",
  AccessControlDenied: "You are not authorized to deposit to this pool.",
  StalePrice: "Oracle prices are stale. Please retry — they will update automatically.",
  InvalidOraclePrice: "Oracle returned an invalid price for this pool. The pool may be misconfigured.",
  EtherTransferNotAllowed:
    "The pool tried to call a contract that doesn't support the expected interface. " +
    "This usually means the pool's price oracle or NFT receipt is misconfigured on-chain.",
};

const CREATE_POOL_ERROR_MESSAGES: Record<string, string> = {
  TokenNotWhitelisted: "One of the selected tokens is not whitelisted by the factory.",
  InvalidCommissionRate: "Commission rate is outside the allowed range.",
  InvalidPoolFee: "Pool fee is outside the allowed range.",
  InvalidCollateralRatio: "Collateral ratio is outside the allowed range.",
  InvalidAssetAddress: "An asset address is invalid (likely the factory's oracle/recipient is unset).",
  InvalidShieldedTokenSymbol: "Shielded token symbol is missing or invalid.",
  InvalidBackingTokenSymbols: "Backing token symbol is missing or invalid.",
  InvalidPoolCreator: "Caller is not authorized to create pools.",
  InitialCreationBondRequired: "This factory requires a creation bond, but none was provided.",
  MaxPoolsExceeded: "The factory has reached its maximum number of pools.",
  SameUnderlyingAsset:
    "Shielded and backing tokens cannot resolve to the same underlying asset (both ERC4626 vaults wrapping the same token).",
  CollateralBelowTokenMinimum:
    "Collateral ratio is below the minimum required for the chosen backing token.",
  CreationBondBelowMinimum: "Creation bond value is below the factory's USD minimum.",
  InvalidTokenDecimals: "One of the tokens has unsupported decimals.",
  EnforcedPause: "The factory is currently paused.",
};

export function parseCreatePoolSimulationError(error: unknown): string {
  if (error instanceof BaseError) {
    const reverted = error.walk(err => err instanceof ContractFunctionRevertedError);
    if (reverted instanceof ContractFunctionRevertedError) {
      const name = reverted.data?.errorName;
      if (name && CREATE_POOL_ERROR_MESSAGES[name]) return CREATE_POOL_ERROR_MESSAGES[name];
      if (reverted.shortMessage) return `Pool creation will fail: ${reverted.shortMessage}`;
    }
    if (error.shortMessage) return `Pool creation will fail: ${error.shortMessage}`;
  }
  if (error instanceof Error) return error.message;
  return "Pool creation simulation failed. Please try again.";
}

export function parseDepositSimulationError(error: unknown): string {
  if (error instanceof BaseError) {
    const reverted = error.walk(err => err instanceof ContractFunctionRevertedError);
    if (reverted instanceof ContractFunctionRevertedError) {
      const name = reverted.data?.errorName;
      if (name && DEPOSIT_ERROR_MESSAGES[name]) {
        return DEPOSIT_ERROR_MESSAGES[name];
      }
      if (reverted.shortMessage) {
        return `Deposit will fail: ${reverted.shortMessage}`;
      }
    }
    if (error.shortMessage) {
      return `Deposit will fail: ${error.shortMessage}`;
    }
  }
  if (error instanceof Error) return error.message;
  return "Deposit simulation failed. Please try again.";
}
