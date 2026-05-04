import type { Address, Hex } from "viem";
import { getProtocolReadClient } from "../networks";

const snapshotRegistryAbi = [
  {
    type: "function",
    name: "latestSnapshot",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "cid", type: "string" },
      { name: "finalizedBlockNumber", type: "uint256" },
      { name: "manifestHash", type: "bytes32" },
      { name: "schemaVersion", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "latest",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "cid", type: "string" },
      { name: "finalizedBlockNumber", type: "uint256" },
      { name: "manifestHash", type: "bytes32" },
      { name: "schemaVersion", type: "uint256" },
    ],
  },
] as const;

export type PointsSnapshotRegistryPointer = {
  cid: string;
  finalizedBlockNumber: bigint;
  manifestHash: Hex;
  schemaVersion: number;
};

export async function fetchSnapshotRegistryPointer(options: {
  address: string;
  chainId: number;
}): Promise<PointsSnapshotRegistryPointer | null> {
  if (!options.address) {
    return null;
  }

  const client = getProtocolReadClient(options.chainId);
  const address = options.address as Address;

  for (const functionName of ["latestSnapshot", "latest"] as const) {
    try {
      const [cid, finalizedBlockNumber, manifestHash, schemaVersion] = await client.readContract({
        address,
        abi: snapshotRegistryAbi,
        functionName,
      });

      if (!cid) {
        return null;
      }

      return {
        cid,
        finalizedBlockNumber,
        manifestHash,
        schemaVersion: Number(schemaVersion),
      };
    } catch {
      // Support either registry function name without forcing a deployment shape too early.
    }
  }

  return null;
}
