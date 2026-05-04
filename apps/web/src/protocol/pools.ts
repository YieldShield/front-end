import { type Address, zeroAddress } from "viem";
import { ERC20_METADATA_ABI, FACTORY_ABI, POOL_ABI } from "./abi";
import { formatTimestamp } from "./format";
import { getProtocolChainById, getProtocolReadClient } from "./networks";

type FactoryPoolInfo = {
  shieldedToken: Address;
  backingToken: Address;
  shieldedTokenSymbol: string;
  backingTokenSymbol: string;
  commissionRate: bigint;
  poolFee: bigint;
  colleteralRatio: bigint;
  createdAt: bigint;
  creator: Address;
};

type PoolBalanceTuple = {
  shieldedTokenPoolBalance: bigint;
  totalBackingTokenPoolBalance: bigint;
};

const FACTORY_POOL_SCAN_BATCH_SIZE = 16;
const FACTORY_POOL_SCAN_LIMIT = 256;

export type PoolSummary = {
  address: Address;
  shieldedToken: Address;
  backingToken: Address;
  shieldedTokenSymbol: string;
  backingTokenSymbol: string;
  commissionRate: bigint;
  poolFee: bigint;
  collateralRatio: bigint;
  createdAt: bigint;
  createdAtLabel: string;
  creator: Address;
  shieldedBalance: bigint;
  backingBalance: bigint;
  shieldedTokenDecimals: number;
  backingTokenDecimals: number;
};

export async function discoverPoolAddresses(chainId: number) {
  const protocolChain = getProtocolChainById(chainId);
  const client = getProtocolReadClient(chainId);

  try {
    const activePools = (await client.readContract({
      address: protocolChain.deployment.factory,
      abi: FACTORY_ABI,
      functionName: "getAllPools",
    })) as Address[];

    if (activePools.length > 0) {
      return activePools;
    }
  } catch {
    // Some Arbitrum Sepolia deployments currently revert on active-pool helper reads.
    // Fall through to the raw pools(index) storage getter, which still works reliably.
  }

  const discoveredAddresses: Address[] = [];

  for (let offset = 0; offset < FACTORY_POOL_SCAN_LIMIT; offset += FACTORY_POOL_SCAN_BATCH_SIZE) {
    const results = await client.multicall({
      allowFailure: true,
      contracts: Array.from({ length: FACTORY_POOL_SCAN_BATCH_SIZE }, (_, index) => ({
        address: protocolChain.deployment.factory,
        abi: FACTORY_ABI,
        functionName: "pools" as const,
        args: [BigInt(offset + index)] as const,
      })),
    });

    let reachedEndOfArray = false;

    results.forEach(result => {
      if (reachedEndOfArray) {
        return;
      }

      if (result.status !== "success") {
        reachedEndOfArray = true;
        return;
      }

      const poolAddress = result.result as Address;
      if (poolAddress === zeroAddress) {
        reachedEndOfArray = true;
        return;
      }

      discoveredAddresses.push(poolAddress);
    });

    if (reachedEndOfArray) {
      break;
    }
  }

  return discoveredAddresses;
}

async function fetchTokenDecimals(chainId: number, tokenAddresses: Address[]) {
  const client = getProtocolReadClient(chainId);

  if (tokenAddresses.length === 0) {
    return new Map<string, number>();
  }

  const results = await client.multicall({
    allowFailure: true,
    contracts: tokenAddresses.map(address => ({
      address,
      abi: ERC20_METADATA_ABI,
      functionName: "decimals" as const,
    })),
  });

  const decimalsMap = new Map<string, number>();

  tokenAddresses.forEach((address, index) => {
    const result = results[index];
    if (result?.status === "success") {
      decimalsMap.set(address.toLowerCase(), Number(result.result));
      return;
    }

    decimalsMap.set(address.toLowerCase(), 18);
  });

  return decimalsMap;
}

function normalizePoolBalances(result: readonly [bigint, bigint]): PoolBalanceTuple {
  return {
    shieldedTokenPoolBalance: result[0],
    totalBackingTokenPoolBalance: result[1],
  };
}

function buildPoolSummary(address: Address, info: FactoryPoolInfo, balances: PoolBalanceTuple, decimalsMap: Map<string, number>) {
  const shieldedTokenDecimals = decimalsMap.get(info.shieldedToken.toLowerCase()) ?? 18;
  const backingTokenDecimals = decimalsMap.get(info.backingToken.toLowerCase()) ?? 18;

  return {
    address,
    shieldedToken: info.shieldedToken,
    backingToken: info.backingToken,
    shieldedTokenSymbol: info.shieldedTokenSymbol,
    backingTokenSymbol: info.backingTokenSymbol,
    commissionRate: info.commissionRate,
    poolFee: info.poolFee,
    collateralRatio: info.colleteralRatio,
    createdAt: info.createdAt,
    createdAtLabel: formatTimestamp(info.createdAt),
    creator: info.creator,
    shieldedBalance: balances.shieldedTokenPoolBalance,
    backingBalance: balances.totalBackingTokenPoolBalance,
    shieldedTokenDecimals,
    backingTokenDecimals,
  } satisfies PoolSummary;
}

export async function fetchPoolsForChain(chainId: number) {
  const protocolChain = getProtocolChainById(chainId);
  const client = getProtocolReadClient(chainId);
  const addresses = await discoverPoolAddresses(chainId);

  const infoResults = addresses.length
    ? await client.multicall({
        allowFailure: true,
        contracts: addresses.map(address => ({
          address: protocolChain.deployment.factory,
          abi: FACTORY_ABI,
          functionName: "getPoolInfo" as const,
          args: [address] as const,
        })),
      })
    : [];

  const poolInfos = addresses
    .map((address, index) => {
      const result = infoResults[index];
      if (result?.status !== "success") {
        return null;
      }

      return {
        address,
        info: result.result as FactoryPoolInfo,
      };
    })
    .filter((entry): entry is { address: Address; info: FactoryPoolInfo } => entry !== null);

  const uniqueTokenAddresses = Array.from(
    new Set(poolInfos.flatMap(({ info }) => [info.shieldedToken.toLowerCase(), info.backingToken.toLowerCase()])),
  ) as Address[];

  const [decimalsMap, balancesResult] = await Promise.all([
    fetchTokenDecimals(chainId, uniqueTokenAddresses),
    poolInfos.length
      ? client.multicall({
          allowFailure: true,
          contracts: poolInfos.map(({ address }) => ({
            address,
            abi: POOL_ABI,
            functionName: "getPoolBalances" as const,
          })),
        })
      : Promise.resolve([]),
  ]);

  return poolInfos
    .map(({ address, info }, index) => {
      const balanceResult = balancesResult[index];
      const balances =
        balanceResult?.status === "success"
          ? normalizePoolBalances(balanceResult.result)
          : ({
              shieldedTokenPoolBalance: 0n,
              totalBackingTokenPoolBalance: 0n,
            } satisfies PoolBalanceTuple);

      return buildPoolSummary(address, info, balances, decimalsMap);
    })
    .sort((left, right) => Number(right.createdAt - left.createdAt));
}

export async function fetchPoolDetail(chainId: number, poolAddress: Address) {
  const protocolChain = getProtocolChainById(chainId);
  const client = getProtocolReadClient(chainId);

  const [infoResult, balanceResult] = await Promise.all([
    client.readContract({
      address: protocolChain.deployment.factory,
      abi: FACTORY_ABI,
      functionName: "getPoolInfo",
      args: [poolAddress],
    }),
    client.readContract({
      address: poolAddress,
      abi: POOL_ABI,
      functionName: "getPoolBalances",
    }),
  ]);

  const info = infoResult as FactoryPoolInfo;
  const balances = normalizePoolBalances(balanceResult);
  const decimalsMap = await fetchTokenDecimals(chainId, [info.shieldedToken, info.backingToken]);

  return buildPoolSummary(poolAddress, info, balances, decimalsMap);
}
