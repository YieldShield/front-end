import { type Address, type Hex } from "viem";
import { HermesClient } from "@pythnetwork/hermes-client";
import { ERC4626_ABI, ORACLE_ABI, PYTH_ORACLE_ABI } from "./abi";
import { getProtocolChainById, getProtocolReadClient } from "./networks";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

// The Sepolia staging Pyth oracle is configured with mainnet feed IDs (e.g.,
// STETH/STONE), so hermes-beta returns 404 for them. The full app always
// uses mainnet for the same reason — match that here.
const HERMES_URL = "https://hermes.pyth.network";

function getHermesClient(_chainId: number) {
  return new HermesClient(HERMES_URL);
}

function getOracleAddresses(chainId: number) {
  const chain = getProtocolChainById(chainId);
  const deployment = chain.deployment as Record<string, Address | undefined>;
  return {
    compositeOracle: deployment.compositeOracle as Address | undefined,
    pythOracle: deployment.pythOracle as Address | undefined,
  };
}

export async function fetchTokenPrice(chainId: number, token: Address): Promise<bigint> {
  const client = getProtocolReadClient(chainId);
  const { compositeOracle } = getOracleAddresses(chainId);
  if (!compositeOracle) return 0n;

  return (await client.readContract({
    address: compositeOracle,
    abi: ORACLE_ABI,
    functionName: "getPrice",
    args: [token],
  })) as bigint;
}

export async function fetchTokenValue(chainId: number, token: Address, amount: bigint): Promise<bigint> {
  const client = getProtocolReadClient(chainId);
  const { compositeOracle } = getOracleAddresses(chainId);
  if (!compositeOracle) return 0n;

  return (await client.readContract({
    address: compositeOracle,
    abi: ORACLE_ABI,
    functionName: "getValue",
    args: [token, amount],
  })) as bigint;
}

export async function checkPriceStaleness(
  chainId: number,
  token: Address,
): Promise<{ isStale: boolean; publishTime: number }> {
  const client = getProtocolReadClient(chainId);
  const { pythOracle } = getOracleAddresses(chainId);
  if (!pythOracle) return { isStale: false, publishTime: 0 };

  const result = (await client.readContract({
    address: pythOracle,
    abi: ORACLE_ABI,
    functionName: "isPriceStale",
    args: [token],
  })) as [boolean, bigint];

  return { isStale: result[0], publishTime: Number(result[1]) };
}

export async function fetchPythFeedId(chainId: number, token: Address): Promise<Hex> {
  const client = getProtocolReadClient(chainId);
  const { pythOracle } = getOracleAddresses(chainId);
  if (!pythOracle) throw new Error("Pyth oracle not configured for this chain");

  return (await client.readContract({
    address: pythOracle,
    abi: PYTH_ORACLE_ABI,
    functionName: "tokenToPriceFeedId",
    args: [token],
  })) as Hex;
}

export async function fetchPriceUpdateData(chainId: number, feedIds: Hex[]): Promise<Hex[]> {
  const hermes = getHermesClient(chainId);

  const cleanIds = feedIds.map(id => (id.startsWith("0x") ? id.slice(2) : id));
  const response = await hermes.getLatestPriceUpdates(cleanIds, { encoding: "hex" });

  if (!response?.binary?.data?.length) {
    throw new Error("No price update data received from Hermes");
  }

  return response.binary.data.map((d: string) => (d.startsWith("0x") ? (d as Hex) : (`0x${d}` as Hex)));
}

// Returns the underlying asset address for an ERC4626 vault token, or null if
// the token doesn't expose `asset()`. Pool tokens like gtUSDC are vaults whose
// composite-oracle price is derived from the underlying's Pyth feed, so we
// must refresh the underlying — not the vault — when prices go stale.
export async function resolveErc4626Underlying(
  chainId: number,
  token: Address,
): Promise<Address | null> {
  const client = getProtocolReadClient(chainId);
  try {
    const underlying = (await client.readContract({
      address: token,
      abi: ERC4626_ABI,
      functionName: "asset",
    })) as Address;
    if (!underlying || underlying.toLowerCase() === ZERO_ADDRESS) return null;
    return underlying;
  } catch {
    return null;
  }
}

// Expand a list of pool tokens with their ERC4626 underlyings and dedupe so
// the freshness flow refreshes every Pyth feed the composite oracle depends
// on. Vault tokens themselves have no Pyth feed; their underlying does.
export async function expandTokensWithUnderlyings(
  chainId: number,
  tokens: Address[],
): Promise<Address[]> {
  const underlyings = await Promise.all(tokens.map(t => resolveErc4626Underlying(chainId, t)));
  const seen = new Set<string>();
  const out: Address[] = [];
  for (const t of [...tokens, ...underlyings]) {
    if (!t) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}

export async function fetchUpdateFee(chainId: number, updateData: Hex[]): Promise<bigint> {
  const client = getProtocolReadClient(chainId);
  const { pythOracle } = getOracleAddresses(chainId);
  if (!pythOracle) throw new Error("Pyth oracle not configured for this chain");

  return (await client.readContract({
    address: pythOracle,
    abi: PYTH_ORACLE_ABI,
    functionName: "getUpdateFee",
    args: [updateData],
  })) as bigint;
}
