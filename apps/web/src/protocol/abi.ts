// Protocol ABI subsets generated from YieldShield/smart-contracts Foundry artifacts.
// Source revision: see smart-contracts-source.json. Deployment addresses are configured separately.
export const FACTORY_ABI = [
  {
    type: "function",
    name: "compositeOracle",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "createPool",
    inputs: [
      {
        name: "_shieldedToken",
        type: "address",
        internalType: "address",
      },
      {
        name: "_shieldedTokenSymbol",
        type: "string",
        internalType: "string",
      },
      {
        name: "_backingToken",
        type: "address",
        internalType: "address",
      },
      {
        name: "_backingTokenSymbol",
        type: "string",
        internalType: "string",
      },
      {
        name: "_commissionRate",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "_poolFee",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "_colleteralRatio",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "_creationBondAmount",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "poolAddress",
        type: "address",
        internalType: "address",
      },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getPoolInfo",
    inputs: [
      {
        name: "_poolAddress",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [
      {
        name: "",
        type: "tuple",
        internalType: "struct ISplitRiskPoolFactory.PoolInfo",
        components: [
          {
            name: "shieldedToken",
            type: "address",
            internalType: "address",
          },
          {
            name: "backingToken",
            type: "address",
            internalType: "address",
          },
          {
            name: "shieldedTokenSymbol",
            type: "string",
            internalType: "string",
          },
          {
            name: "backingTokenSymbol",
            type: "string",
            internalType: "string",
          },
          {
            name: "commissionRate",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "poolFee",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "colleteralRatio",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "createdAt",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "creator",
            type: "address",
            internalType: "address",
          },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getPools",
    inputs: [
      {
        name: "offset",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "limit",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "poolSlice",
        type: "address[]",
        internalType: "address[]",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getWhitelistedTokens",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address[]",
        internalType: "address[]",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "minimumCreationBondUsd",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "poolCount",
    inputs: [],
    outputs: [
      {
        name: "count",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "pools",
    inputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "error",
    name: "CollateralBelowTokenMinimum",
    inputs: [
      {
        name: "provided",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "minimum",
        type: "uint256",
        internalType: "uint256",
      },
    ],
  },
  {
    type: "error",
    name: "CreationBondBelowMinimum",
    inputs: [
      {
        name: "providedUsd",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "minimumUsd",
        type: "uint256",
        internalType: "uint256",
      },
    ],
  },
  {
    type: "error",
    name: "InitialCreationBondRequired",
    inputs: [],
  },
  {
    type: "error",
    name: "InvalidAssetAddress",
    inputs: [],
  },
  {
    type: "error",
    name: "InvalidBackingTokenSymbols",
    inputs: [],
  },
  {
    type: "error",
    name: "InvalidCollateralRatio",
    inputs: [],
  },
  {
    type: "error",
    name: "InvalidShieldedTokenSymbol",
    inputs: [],
  },
  {
    type: "error",
    name: "InvalidTokenDecimals",
    inputs: [
      {
        name: "token",
        type: "address",
        internalType: "address",
      },
      {
        name: "decimals",
        type: "uint8",
        internalType: "uint8",
      },
    ],
  },
  {
    type: "error",
    name: "MaxPoolsExceeded",
    inputs: [
      {
        name: "current",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "max",
        type: "uint256",
        internalType: "uint256",
      },
    ],
  },
  {
    type: "error",
    name: "TokenNotWhitelisted",
    inputs: [],
  },
  {
    type: "error",
    name: "TokenNotWhitelisted",
    inputs: [],
  },
] as const;

export const POOL_ABI = [
  {
    type: "function",
    name: "cancelUnlockProcess",
    inputs: [
      {
        name: "tokenId",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "claimCommission",
    inputs: [
      {
        name: "tokenId",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "claimRewards",
    inputs: [
      {
        name: "tokenId",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "depositBackingAsset",
    inputs: [
      {
        name: "asset",
        type: "address",
        internalType: "address",
      },
      {
        name: "depositAmount",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "minReceivedAmount",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "tokenId",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "depositShieldedAsset",
    inputs: [
      {
        name: "asset",
        type: "address",
        internalType: "address",
      },
      {
        name: "depositAmount",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "minReceivedAmount",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "tokenId",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getPoolBalances",
    inputs: [],
    outputs: [
      {
        name: "shieldedTokenPoolBalance",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "totalBackingTokenPoolBalance",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getProtectorDepositInfo",
    inputs: [
      {
        name: "tokenId",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "amount",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "depositTime",
        type: "uint64",
        internalType: "uint64",
      },
      {
        name: "unlockRequestTime",
        type: "uint64",
        internalType: "uint64",
      },
      {
        name: "lockedAmount",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "availableAmount",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "claimableCommission",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getShieldDepositInfo",
    inputs: [
      {
        name: "tokenId",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "amount",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "depositTime",
        type: "uint64",
        internalType: "uint64",
      },
      {
        name: "valueAtDeposit",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "lastFeeClaimTime",
        type: "uint64",
        internalType: "uint64",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getUserNFTCounts",
    inputs: [
      {
        name: "user",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [
      {
        name: "shieldNFTCount",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "protectorNFTCount",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "partialWithdrawShielded",
    inputs: [
      {
        name: "tokenId",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "withdrawAmount",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "preferredAsset",
        type: "address",
        internalType: "address",
      },
      {
        name: "minAmountOut",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "newTokenId",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "poolConfig",
    inputs: [],
    outputs: [
      {
        name: "shieldedMinDepositAmount",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "shieldedMaxDepositAmount",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "backingMinDepositAmount",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "backingMaxDepositAmount",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "maxTotalValueLockedUsd",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "minimumPoolTime",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "unlockDuration",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "protocolFeeRecipient",
        type: "address",
        internalType: "address",
      },
      {
        name: "protocolFee",
        type: "uint96",
        internalType: "uint96",
      },
      {
        name: "priceOracle",
        type: "address",
        internalType: "address",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "protectorReceiptNFT",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "protectorWithdraw",
    inputs: [
      {
        name: "tokenId",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "amount",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "preferredAsset",
        type: "address",
        internalType: "address",
      },
      {
        name: "minAmountOut",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "shieldReceiptNFT",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "shieldedWithdraw",
    inputs: [
      {
        name: "tokenId",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "preferredAsset",
        type: "address",
        internalType: "address",
      },
      {
        name: "minAmountOut",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "startUnlockProcess",
    inputs: [
      {
        name: "tokenId",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "error",
    name: "AccessControlDenied",
    inputs: [
      {
        name: "account",
        type: "address",
        internalType: "address",
      },
      {
        name: "operation",
        type: "string",
        internalType: "string",
      },
    ],
  },
  {
    type: "error",
    name: "DepositAmountTooLarge",
    inputs: [],
  },
  {
    type: "error",
    name: "EnforcedPause",
    inputs: [],
  },
  {
    type: "error",
    name: "EtherTransferNotAllowed",
    inputs: [],
  },
  {
    type: "error",
    name: "InsufficientDepositAmount",
    inputs: [],
  },
  {
    type: "error",
    name: "InsufficientProtectorTokenBalance",
    inputs: [],
  },
  {
    type: "error",
    name: "InsufficientTokenBalance",
    inputs: [],
  },
  {
    type: "error",
    name: "InvalidOraclePrice",
    inputs: [],
  },
  {
    type: "error",
    name: "SlippageProtectionFailed",
    inputs: [
      {
        name: "minExpected",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "actualReceived",
        type: "uint256",
        internalType: "uint256",
      },
    ],
  },
  {
    type: "error",
    name: "TVLLimitExceeded",
    inputs: [],
  },
  {
    type: "error",
    name: "TransferOperationFailed",
    inputs: [],
  },
  {
    type: "error",
    name: "UnsupportedAsset",
    inputs: [],
  },
] as const;

export const ERC4626_ABI = [
  {
    type: "function",
    name: "asset",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
      },
    ],
  },
] as const;

export const ERC20_METADATA_ABI = [
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint8",
      },
    ],
  },
  {
    type: "function",
    name: "symbol",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "string",
      },
    ],
  },
] as const;

export const GOVERNANCE_TOKEN_ABI = [
  {
    type: "function",
    name: "balanceOf",
    inputs: [
      {
        name: "account",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "delegates",
    inputs: [
      {
        name: "account",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getVotes",
    inputs: [
      {
        name: "account",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
] as const;

export const GOVERNOR_ABI = [
  {
    type: "function",
    name: "proposalThreshold",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "proposalVotes",
    inputs: [
      {
        name: "proposalId",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "againstVotes",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "forVotes",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "abstainVotes",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "quorum",
    inputs: [
      {
        name: "timepoint",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "state",
    inputs: [
      {
        name: "proposalId",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "",
        type: "uint8",
        internalType: "enum IGovernor.ProposalState",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "votingDelay",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "votingPeriod",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
] as const;

export const GOVERNOR_PROPOSAL_CREATED_EVENT = {
  type: "event",
  name: "ProposalCreated",
  inputs: [
    {
      name: "proposalId",
      type: "uint256",
      indexed: false,
      internalType: "uint256",
    },
    {
      name: "proposer",
      type: "address",
      indexed: false,
      internalType: "address",
    },
    {
      name: "targets",
      type: "address[]",
      indexed: false,
      internalType: "address[]",
    },
    {
      name: "values",
      type: "uint256[]",
      indexed: false,
      internalType: "uint256[]",
    },
    {
      name: "signatures",
      type: "string[]",
      indexed: false,
      internalType: "string[]",
    },
    {
      name: "calldatas",
      type: "bytes[]",
      indexed: false,
      internalType: "bytes[]",
    },
    {
      name: "voteStart",
      type: "uint256",
      indexed: false,
      internalType: "uint256",
    },
    {
      name: "voteEnd",
      type: "uint256",
      indexed: false,
      internalType: "uint256",
    },
    {
      name: "description",
      type: "string",
      indexed: false,
      internalType: "string",
    },
  ],
  anonymous: false,
} as const;

export const TIMELOCK_ABI = [
  {
    type: "function",
    name: "getMinDelay",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
] as const;

export const ERC20_ABI = [
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "spender",
        type: "address",
      },
      {
        name: "amount",
        type: "uint256",
      },
    ],
    outputs: [
      {
        name: "",
        type: "bool",
      },
    ],
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      {
        name: "owner",
        type: "address",
      },
      {
        name: "spender",
        type: "address",
      },
    ],
    outputs: [
      {
        name: "",
        type: "uint256",
      },
    ],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [
      {
        name: "account",
        type: "address",
      },
    ],
    outputs: [
      {
        name: "",
        type: "uint256",
      },
    ],
  },
] as const;

export const ORACLE_ABI = [
  {
    type: "function",
    name: "getPrice",
    inputs: [
      {
        name: "token",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getValue",
    inputs: [
      {
        name: "token",
        type: "address",
        internalType: "address",
      },
      {
        name: "amount",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "isPriceStale",
    inputs: [
      {
        name: "token",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [
      {
        name: "isStale",
        type: "bool",
        internalType: "bool",
      },
      {
        name: "publishTime",
        type: "uint64",
        internalType: "uint64",
      },
    ],
    stateMutability: "view",
  },
] as const;

export const PYTH_ORACLE_ABI = [
  {
    type: "function",
    name: "getUpdateFee",
    inputs: [
      {
        name: "priceUpdateData",
        type: "bytes[]",
        internalType: "bytes[]",
      },
    ],
    outputs: [
      {
        name: "fee",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "tokenToPriceFeedId",
    inputs: [
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [
      {
        name: "",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "updatePriceFeeds",
    inputs: [
      {
        name: "priceUpdateData",
        type: "bytes[]",
        internalType: "bytes[]",
      },
    ],
    outputs: [],
    stateMutability: "payable",
  },
] as const;

export const RECEIPT_NFT_ABI = [
  {
    type: "function",
    name: "nextTokenId",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "ownerOf",
    inputs: [
      {
        name: "tokenId",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    stateMutability: "view",
  },
] as const;

export const FAUCET_ABI = [
  {
    type: "function",
    name: "canDrip",
    inputs: [
      {
        name: "token",
        type: "address",
        internalType: "address",
      },
      {
        name: "recipient",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [
      {
        name: "canDripNow",
        type: "bool",
        internalType: "bool",
      },
      {
        name: "nextDripTime",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "drip",
    inputs: [
      {
        name: "token",
        type: "address",
        internalType: "address",
      },
      {
        name: "recipient",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "dripAll",
    inputs: [
      {
        name: "recipient",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getAllTokens",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address[]",
        internalType: "address[]",
      },
    ],
    stateMutability: "view",
  },
] as const;
