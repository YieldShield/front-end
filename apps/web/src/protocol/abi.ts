export const FACTORY_ABI = [
  {
    type: "function",
    name: "pools",
    stateMutability: "view",
    inputs: [{ name: "index", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "getAllPools",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address[]" }],
  },
  {
    type: "function",
    name: "getWhitelistedTokens",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address[]" }],
  },
  {
    type: "function",
    name: "getPoolInfo",
    stateMutability: "view",
    inputs: [{ name: "pool", type: "address" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "shieldedToken", type: "address" },
          { name: "backingToken", type: "address" },
          { name: "shieldedTokenSymbol", type: "string" },
          { name: "backingTokenSymbol", type: "string" },
          { name: "commissionRate", type: "uint256" },
          { name: "poolFee", type: "uint256" },
          { name: "colleteralRatio", type: "uint256" },
          { name: "createdAt", type: "uint256" },
          { name: "creator", type: "address" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "createPool",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_shieldedToken", type: "address" },
      { name: "_shieldedTokenSymbol", type: "string" },
      { name: "_backingToken", type: "address" },
      { name: "_backingTokenSymbol", type: "string" },
      { name: "_commissionRate", type: "uint256" },
      { name: "_poolFee", type: "uint256" },
      { name: "_colleteralRatio", type: "uint256" },
    ],
    outputs: [{ name: "poolAddress", type: "address" }],
  },
  // --- factory custom errors (subset relevant to createPool) ---
  { type: "error", name: "TokenNotWhitelisted", inputs: [] },
  { type: "error", name: "InvalidCommissionRate", inputs: [] },
  { type: "error", name: "InvalidPoolFee", inputs: [] },
  { type: "error", name: "InvalidCollateralRatio", inputs: [] },
  { type: "error", name: "InvalidAssetAddress", inputs: [] },
  { type: "error", name: "InvalidShieldedTokenSymbol", inputs: [] },
  { type: "error", name: "InvalidBackingTokenSymbols", inputs: [] },
  { type: "error", name: "InvalidPoolCreator", inputs: [] },
  { type: "error", name: "InitialCreationBondRequired", inputs: [] },
  {
    type: "error",
    name: "MaxPoolsExceeded",
    inputs: [
      { name: "current", type: "uint256" },
      { name: "max", type: "uint256" },
    ],
  },
  {
    type: "error",
    name: "SameUnderlyingAsset",
    inputs: [
      { name: "shieldedToken", type: "address" },
      { name: "backingToken", type: "address" },
      { name: "underlyingAsset", type: "address" },
    ],
  },
  {
    type: "error",
    name: "CollateralBelowTokenMinimum",
    inputs: [
      { name: "provided", type: "uint256" },
      { name: "minimum", type: "uint256" },
    ],
  },
  {
    type: "error",
    name: "CreationBondBelowMinimum",
    inputs: [
      { name: "providedUsd", type: "uint256" },
      { name: "minimumUsd", type: "uint256" },
    ],
  },
  {
    type: "error",
    name: "InvalidTokenDecimals",
    inputs: [
      { name: "token", type: "address" },
      { name: "decimals", type: "uint8" },
    ],
  },
] as const;

export const POOL_ABI = [
  // --- reads ---
  {
    type: "function",
    name: "getPoolBalances",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "shieldedTokenPoolBalance", type: "uint256" },
      { name: "totalBackingTokenPoolBalance", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "poolConfig",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "shieldedMinDepositAmount", type: "uint256" },
          { name: "shieldedMaxDepositAmount", type: "uint256" },
          { name: "backingMinDepositAmount", type: "uint256" },
          { name: "backingMaxDepositAmount", type: "uint256" },
          { name: "maxTotalValueLockedUsd", type: "uint256" },
          { name: "minimumPoolTime", type: "uint256" },
          { name: "unlockDuration", type: "uint256" },
          { name: "protocolFeeRecipient", type: "address" },
          { name: "protocolFee", type: "uint96" },
          { name: "priceOracle", type: "address" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "getShieldDepositInfo",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [
      { name: "amount", type: "uint256" },
      { name: "depositTime", type: "uint64" },
      { name: "valueAtDeposit", type: "uint256" },
      { name: "lastFeeClaimTime", type: "uint64" },
      { name: "isWithdrawn", type: "bool" },
    ],
  },
  {
    type: "function",
    name: "getProtectorDepositInfo",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [
      { name: "amount", type: "uint256" },
      { name: "depositTime", type: "uint64" },
      { name: "unlockRequestTime", type: "uint64" },
      { name: "lockedAmount", type: "uint256" },
      { name: "availableAmount", type: "uint256" },
      { name: "claimableCommission", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "getUserNFTCounts",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [
      { name: "shieldNFTCount", type: "uint256" },
      { name: "protectorNFTCount", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "shieldReceiptNFT",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "protectorReceiptNFT",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  // --- writes ---
  {
    type: "function",
    name: "depositShieldedAsset",
    stateMutability: "nonpayable",
    inputs: [
      { name: "asset", type: "address" },
      { name: "depositAmount", type: "uint256" },
      { name: "minReceivedAmount", type: "uint256" },
    ],
    outputs: [{ name: "tokenId", type: "uint256" }],
  },
  {
    type: "function",
    name: "depositBackingAsset",
    stateMutability: "nonpayable",
    inputs: [
      { name: "asset", type: "address" },
      { name: "depositAmount", type: "uint256" },
      { name: "minReceivedAmount", type: "uint256" },
    ],
    outputs: [{ name: "tokenId", type: "uint256" }],
  },
  {
    type: "function",
    name: "shieldedWithdraw",
    stateMutability: "nonpayable",
    inputs: [
      { name: "tokenId", type: "uint256" },
      { name: "preferredAsset", type: "address" },
      { name: "minAmountOut", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "partialWithdrawShielded",
    stateMutability: "nonpayable",
    inputs: [
      { name: "tokenId", type: "uint256" },
      { name: "withdrawAmount", type: "uint256" },
      { name: "preferredAsset", type: "address" },
      { name: "minAmountOut", type: "uint256" },
    ],
    outputs: [{ name: "newTokenId", type: "uint256" }],
  },
  {
    type: "function",
    name: "claimRewards",
    stateMutability: "nonpayable",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "claimCommission",
    stateMutability: "nonpayable",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "startUnlockProcess",
    stateMutability: "nonpayable",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "cancelUnlockProcess",
    stateMutability: "nonpayable",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "protectorWithdraw",
    stateMutability: "nonpayable",
    inputs: [
      { name: "tokenId", type: "uint256" },
      { name: "amount", type: "uint256" },
      { name: "preferredAsset", type: "address" },
      { name: "minAmountOut", type: "uint256" },
    ],
    outputs: [],
  },
  // --- custom errors (subset relevant to deposit / withdraw flows) ---
  { type: "error", name: "InsufficientDepositAmount", inputs: [] },
  { type: "error", name: "DepositAmountTooLarge", inputs: [] },
  { type: "error", name: "UnsupportedAsset", inputs: [] },
  { type: "error", name: "TVLLimitExceeded", inputs: [] },
  { type: "error", name: "TransferOperationFailed", inputs: [] },
  { type: "error", name: "InsufficientProtectorTokenBalance", inputs: [] },
  { type: "error", name: "InsufficientTokenBalance", inputs: [] },
  { type: "error", name: "EnforcedPause", inputs: [] },
  { type: "error", name: "EtherTransferNotAllowed", inputs: [] },
  { type: "error", name: "InvalidOraclePrice", inputs: [] },
  {
    type: "error",
    name: "SlippageProtectionFailed",
    inputs: [
      { name: "minExpected", type: "uint256" },
      { name: "actualReceived", type: "uint256" },
    ],
  },
  {
    type: "error",
    name: "AccessControlDenied",
    inputs: [
      { name: "account", type: "address" },
      { name: "operation", type: "string" },
    ],
  },
  {
    type: "error",
    name: "StalePrice",
    inputs: [
      { name: "token", type: "address" },
      { name: "feedId", type: "bytes32" },
      { name: "publishTime", type: "uint64" },
    ],
  },
] as const;

export const ERC4626_ABI = [
  {
    type: "function",
    name: "asset",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
] as const;

export const ERC20_METADATA_ABI = [
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    type: "function",
    name: "symbol",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
] as const;

export const GOVERNANCE_TOKEN_ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "delegates",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "getVotes",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export const GOVERNOR_ABI = [
  {
    type: "function",
    name: "proposalThreshold",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "proposalVotes",
    stateMutability: "view",
    inputs: [{ name: "proposalId", type: "uint256" }],
    outputs: [
      { name: "againstVotes", type: "uint256" },
      { name: "forVotes", type: "uint256" },
      { name: "abstainVotes", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "quorum",
    stateMutability: "view",
    inputs: [{ name: "timepoint", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "state",
    stateMutability: "view",
    inputs: [{ name: "proposalId", type: "uint256" }],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    type: "function",
    name: "votingDelay",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "votingPeriod",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export const GOVERNOR_PROPOSAL_CREATED_EVENT = {
  type: "event",
  name: "ProposalCreated",
  anonymous: false,
  inputs: [
    { name: "proposalId", type: "uint256", indexed: false },
    { name: "proposer", type: "address", indexed: false },
    { name: "targets", type: "address[]", indexed: false },
    { name: "values", type: "uint256[]", indexed: false },
    { name: "signatures", type: "string[]", indexed: false },
    { name: "calldatas", type: "bytes[]", indexed: false },
    { name: "voteStart", type: "uint256", indexed: false },
    { name: "voteEnd", type: "uint256", indexed: false },
    { name: "description", type: "string", indexed: false },
  ],
} as const;

export const TIMELOCK_ABI = [
  {
    type: "function",
    name: "getMinDelay",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export const ERC20_ABI = [
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export const ORACLE_ABI = [
  {
    type: "function",
    name: "getPrice",
    stateMutability: "view",
    inputs: [{ name: "token", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "getValue",
    stateMutability: "view",
    inputs: [
      { name: "token", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "isPriceStale",
    stateMutability: "view",
    inputs: [{ name: "token", type: "address" }],
    outputs: [
      { name: "isStale", type: "bool" },
      { name: "publishTime", type: "uint64" },
    ],
  },
] as const;

export const PYTH_ORACLE_ABI = [
  {
    type: "function",
    name: "updatePriceFeeds",
    stateMutability: "payable",
    inputs: [{ name: "priceUpdateData", type: "bytes[]" }],
    outputs: [],
  },
  {
    type: "function",
    name: "getUpdateFee",
    stateMutability: "view",
    inputs: [{ name: "priceUpdateData", type: "bytes[]" }],
    outputs: [{ name: "fee", type: "uint256" }],
  },
  {
    type: "function",
    name: "tokenToPriceFeedId",
    stateMutability: "view",
    inputs: [{ name: "token", type: "address" }],
    outputs: [{ name: "", type: "bytes32" }],
  },
] as const;

export const RECEIPT_NFT_ABI = [
  {
    type: "function",
    name: "nextTokenId",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "ownerOf",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
  },
] as const;

export const FAUCET_ABI = [
  {
    type: "function",
    name: "getAllTokens",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address[]" }],
  },
  {
    type: "function",
    name: "canDrip",
    stateMutability: "view",
    inputs: [
      { name: "token", type: "address" },
      { name: "recipient", type: "address" },
    ],
    outputs: [
      { name: "canDripNow", type: "bool" },
      { name: "nextDripTime", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "drip",
    stateMutability: "nonpayable",
    inputs: [
      { name: "token", type: "address" },
      { name: "recipient", type: "address" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "dripAll",
    stateMutability: "nonpayable",
    inputs: [{ name: "recipient", type: "address" }],
    outputs: [],
  },
] as const;
