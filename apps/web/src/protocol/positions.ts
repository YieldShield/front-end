import { type Address } from "viem";
import { POOL_ABI, RECEIPT_NFT_ABI } from "./abi";
import { getProtocolReadClient } from "./networks";
import { discoverPoolAddresses } from "./pools";
import { isPointsConfigured } from "./points";
import { appEnv } from "../config/env";

export type ShieldPosition = {
  tokenId: bigint;
  poolAddress: Address;
  amount: bigint;
  depositTime: number;
  valueAtDeposit: bigint;
  lastFeeClaimTime: number;
  isWithdrawn: boolean;
};

export type ProtectorPosition = {
  tokenId: bigint;
  poolAddress: Address;
  amount: bigint;
  depositTime: number;
  unlockRequestTime: number;
  lockedAmount: bigint;
  availableAmount: bigint;
  claimableCommission: bigint;
};

export type UserPositions = {
  shieldPositions: ShieldPosition[];
  protectorPositions: ProtectorPosition[];
};

const EMPTY_POSITIONS: UserPositions = { shieldPositions: [], protectorPositions: [] };
const NFT_SCAN_BATCH_SIZE = 16;

// --- Ponder-based discovery (fast, optional) ---

export async function fetchPositionsFromPonder(userAddress: Address): Promise<UserPositions | null> {
  const endpoint = appEnv.ponderGraphqlUrl;
  if (!endpoint || !isPointsConfigured()) return null;

  // TODO: add Ponder GraphQL position queries once the schema supports it.
  // For now, fall through to on-chain scanning.
  return null;
}

// --- On-chain NFT scanning fallback ---

async function scanNftOwnership(
  chainId: number,
  nftAddress: Address,
  userAddress: Address,
  expectedOwnedCount: bigint,
): Promise<bigint[]> {
  const client = getProtocolReadClient(chainId);

  const maxId = (await client.readContract({
    address: nftAddress,
    abi: RECEIPT_NFT_ABI,
    functionName: "nextTokenId",
  })) as bigint;

  const ownedTokenIds: bigint[] = [];

  for (let offset = 0n; offset < maxId; offset += BigInt(NFT_SCAN_BATCH_SIZE)) {
    const remaining = maxId - offset;
    const batchSize = Number(remaining < BigInt(NFT_SCAN_BATCH_SIZE) ? remaining : BigInt(NFT_SCAN_BATCH_SIZE));

    const results = await client.multicall({
      allowFailure: true,
      contracts: Array.from({ length: batchSize }, (_, i) => ({
        address: nftAddress,
        abi: RECEIPT_NFT_ABI,
        functionName: "ownerOf" as const,
        args: [offset + BigInt(i)] as const,
      })),
    });

    for (let i = 0; i < batchSize; i++) {
      const result = results[i];
      if (
        result?.status === "success" &&
        (result.result as string).toLowerCase() === userAddress.toLowerCase()
      ) {
        ownedTokenIds.push(offset + BigInt(i));
      }
    }

    if (BigInt(ownedTokenIds.length) >= expectedOwnedCount) {
      break;
    }
  }

  return ownedTokenIds;
}

export async function fetchPositionsOnChain(
  chainId: number,
  userAddress: Address,
  poolAddresses: Address[],
): Promise<UserPositions> {
  const client = getProtocolReadClient(chainId);
  const shieldPositions: ShieldPosition[] = [];
  const protectorPositions: ProtectorPosition[] = [];

  for (const poolAddress of poolAddresses) {
    // Check if user has any positions in this pool
    let shieldCount: bigint;
    let protectorCount: bigint;
    try {
      const counts = (await client.readContract({
        address: poolAddress,
        abi: POOL_ABI,
        functionName: "getUserNFTCounts",
        args: [userAddress],
      })) as [bigint, bigint];
      shieldCount = counts[0];
      protectorCount = counts[1];
    } catch {
      continue;
    }

    if (shieldCount === 0n && protectorCount === 0n) continue;

    // Read NFT contract addresses
    const [shieldNftResult, protectorNftResult] = await client.multicall({
      allowFailure: true,
      contracts: [
        { address: poolAddress, abi: POOL_ABI, functionName: "shieldReceiptNFT" as const },
        { address: poolAddress, abi: POOL_ABI, functionName: "protectorReceiptNFT" as const },
      ],
    });

    // Scan shield positions
    if (shieldCount > 0n && shieldNftResult?.status === "success") {
      const shieldNft = shieldNftResult.result as Address;
      const ownedIds = await scanNftOwnership(chainId, shieldNft, userAddress, shieldCount);

      if (ownedIds.length > 0) {
        const infoResults = await client.multicall({
          allowFailure: true,
          contracts: ownedIds.map(tokenId => ({
            address: poolAddress,
            abi: POOL_ABI,
            functionName: "getShieldDepositInfo" as const,
            args: [tokenId] as const,
          })),
        });

        for (let i = 0; i < ownedIds.length; i++) {
          const result = infoResults[i];
          if (result?.status !== "success") continue;
          const [amount, depositTime, valueAtDeposit, lastFeeClaimTime, isWithdrawn] =
            result.result as [bigint, bigint, bigint, bigint, boolean];

          shieldPositions.push({
            tokenId: ownedIds[i],
            poolAddress,
            amount,
            depositTime: Number(depositTime),
            valueAtDeposit,
            lastFeeClaimTime: Number(lastFeeClaimTime),
            isWithdrawn,
          });
        }
      }
    }

    // Scan protector positions
    if (protectorCount > 0n && protectorNftResult?.status === "success") {
      const protectorNft = protectorNftResult.result as Address;
      const ownedIds = await scanNftOwnership(chainId, protectorNft, userAddress, protectorCount);

      if (ownedIds.length > 0) {
        const infoResults = await client.multicall({
          allowFailure: true,
          contracts: ownedIds.map(tokenId => ({
            address: poolAddress,
            abi: POOL_ABI,
            functionName: "getProtectorDepositInfo" as const,
            args: [tokenId] as const,
          })),
        });

        for (let i = 0; i < ownedIds.length; i++) {
          const result = infoResults[i];
          if (result?.status !== "success") continue;
          const [amount, depositTime, unlockRequestTime, lockedAmount, availableAmount, claimableCommission] =
            result.result as [bigint, bigint, bigint, bigint, bigint, bigint];

          protectorPositions.push({
            tokenId: ownedIds[i],
            poolAddress,
            amount,
            depositTime: Number(depositTime),
            unlockRequestTime: Number(unlockRequestTime),
            lockedAmount,
            availableAmount,
            claimableCommission,
          });
        }
      }
    }
  }

  return { shieldPositions, protectorPositions };
}

export async function fetchUserPositions(
  chainId: number,
  userAddress: Address,
): Promise<UserPositions> {
  // Try Ponder first
  const ponderResult = await fetchPositionsFromPonder(userAddress);
  if (ponderResult) return ponderResult;

  // Fall back to on-chain scanning
  const poolAddresses = await discoverPoolAddresses(chainId);
  if (poolAddresses.length === 0) return EMPTY_POSITIONS;

  return fetchPositionsOnChain(chainId, userAddress, poolAddresses);
}
