import { type Address, createPublicClient } from "viem";
import { arbitrumSepolia, foundry } from "viem/chains";
import { appEnv } from "../config/env";
import { createHttpTransportForChainId, getRpcUrlForChainId as resolveRpcUrlForChainId } from "./rpc";

export type ProtocolChainKey = "arbitrumSepolia" | "foundry";

type ProtocolDeployment = {
  factory: Address;
  governor: Address;
  timelock?: Address;
  poolImplementation?: Address;
  pythOracle?: Address;
  compositeOracle?: Address;
  erc4626OracleFeed?: Address;
  mockTokenFaucet?: Address;
  ysToken: Address;
};

export type ProtocolChainConfig = {
  id: number;
  key: ProtocolChainKey;
  label: string;
  rpcUrl: string;
  chain: typeof arbitrumSepolia | typeof foundry;
  deployment: ProtocolDeployment;
};

const protocolChains = {
  arbitrumSepolia: {
    id: arbitrumSepolia.id,
    key: "arbitrumSepolia",
    label: "Arbitrum Sepolia",
    rpcUrl: resolveRpcUrlForChainId(arbitrumSepolia.id),
    chain: arbitrumSepolia,
    // Staging release s1.0.2 (matches staging.yieldshield.net).
    deployment: {
      factory: "0x755C9bd97B882278E3d19D2A1e31ad522C3f6483",
      governor: "0x6E6d60fAc4FE03279652fe28ea7d837E51e091Ca",
      timelock: "0xEC57FcFBAe031B4d983a24A5688949FAE5Ee848C",
      poolImplementation: "0xa9a98eaEFc534c8f53C7FbEc6B38fE77E83AbbA3",
      pythOracle: "0x6cEB6aFDe5F6C01B00D622B35Fc201a57c30c671",
      compositeOracle: "0x0ACfDdEFF4c047F657AB026812dcdf5497c528e8",
      erc4626OracleFeed: "0x2D31DbF4b63DADA0053951a2B667f92336d22e91",
      mockTokenFaucet: "0x463C71d06a8646C1EA455bfaa1a6F365820050e4",
      ysToken: "0x59901b01FAa6d4928FBB24838D009B47d47631a8",
    },
  },
  foundry: {
    id: foundry.id,
    key: "foundry",
    label: "Local Foundry",
    rpcUrl: resolveRpcUrlForChainId(foundry.id),
    chain: foundry,
    deployment: {
      factory: "0xfC8d2a49bFa827605Ed7dC01317fA9D9cC1bf3bB",
      governor: "0x12061Cc3c316C680723F0781bBD6FC5c16C4bB40",
      ysToken: "0x4Ba19F6fBF97E954D2980EbDAe23cD86BDfA04Bc",
    },
  },
} as const satisfies Record<ProtocolChainKey, ProtocolChainConfig>;

const publicClients = new Map<number, ReturnType<typeof createPublicClient>>();

export function getDefaultProtocolChain() {
  return protocolChains[appEnv.defaultChain as ProtocolChainKey] ?? protocolChains.arbitrumSepolia;
}

export function getProtocolChainById(chainId: number) {
  const chain = Object.values(protocolChains).find(candidate => candidate.id === chainId);
  return chain ?? getDefaultProtocolChain();
}

export function isSupportedProtocolChainId(chainId: number) {
  return Object.values(protocolChains).some(candidate => candidate.id === chainId);
}

export function getRpcUrlForChainId(chainId: number) {
  return resolveRpcUrlForChainId(chainId);
}

export function getProtocolReadClient(chainId: number) {
  const existing = publicClients.get(chainId);
  if (existing) {
    return existing;
  }

  const protocolChain = getProtocolChainById(chainId);
  const client = createPublicClient({
    chain: protocolChain.chain,
    transport: createHttpTransportForChainId(protocolChain.id),
  });

  publicClients.set(chainId, client);
  return client;
}
