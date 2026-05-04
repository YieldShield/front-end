import { fallback, http } from "viem";
import { arbitrumSepolia, foundry } from "viem/chains";
import { appEnv } from "../config/env";

const ARBITRUM_SEPOLIA_BROWSER_FALLBACK_RPCS = [
  "https://arbitrum-sepolia-rpc.publicnode.com",
  "https://arbitrum-sepolia.gateway.tenderly.co",
] as const;

export const ARBITRUM_SEPOLIA_BROWSER_FALLBACK_RPC = ARBITRUM_SEPOLIA_BROWSER_FALLBACK_RPCS[0];

const ARBITRUM_SEPOLIA_BROWSER_UNSAFE_PUBLIC_RPCS = ["https://sepolia-rollup.arbitrum.io/rpc"];

type RpcResolution = {
  url: string;
  urls: readonly string[];
  source: "env" | "fallback";
  label: string;
};

function createRpcResolution(params: {
  envUrls: readonly string[];
  fallbackUrls: readonly string[];
  envLabel: string;
  fallbackLabel: string;
}) {
  const urls = params.envUrls.length ? params.envUrls : params.fallbackUrls;

  return {
    url: urls[0],
    urls,
    source: params.envUrls.length ? "env" : "fallback",
    label: params.envUrls.length ? params.envLabel : params.fallbackLabel,
  } satisfies RpcResolution;
}

const rpcResolutions = {
  [arbitrumSepolia.id]: createRpcResolution({
    envUrls: appEnv.rpcUrls421614,
    fallbackUrls: ARBITRUM_SEPOLIA_BROWSER_FALLBACK_RPCS,
    envLabel: "Using VITE_RPC_URL_421614 or VITE_RPC_URLS_421614.",
    fallbackLabel: "Using the Chainlist-listed Arbitrum Sepolia fallback list.",
  }),
  [foundry.id]: createRpcResolution({
    envUrls: appEnv.rpcUrl31337 ? [appEnv.rpcUrl31337] : [],
    fallbackUrls: ["http://127.0.0.1:8545"],
    envLabel: "Using VITE_RPC_URL_31337.",
    fallbackLabel: "Using the default local Foundry RPC.",
  }),
} as const satisfies Record<number, RpcResolution>;

export function getRpcResolutionForChainId(chainId: number) {
  return rpcResolutions[chainId as keyof typeof rpcResolutions] ?? rpcResolutions[arbitrumSepolia.id];
}

export function getRpcUrlForChainId(chainId: number) {
  return getRpcResolutionForChainId(chainId).url;
}

export function getRpcUrlsForChainId(chainId: number) {
  return getRpcResolutionForChainId(chainId).urls;
}

function normalizeRpcUrl(url: string) {
  return url.replace(/\/+$/, "");
}

function isKnownBrowserUnsafePublicRpcUrl(chainId: number, rpcUrl: string) {
  const normalizedUrl = normalizeRpcUrl(rpcUrl);

  return (
    chainId === arbitrumSepolia.id &&
    ARBITRUM_SEPOLIA_BROWSER_UNSAFE_PUBLIC_RPCS.some(url => normalizeRpcUrl(url) === normalizedUrl)
  );
}

export function isKnownBrowserUnsafePublicRpcForChainId(chainId: number) {
  const rpcUrls = getRpcUrlsForChainId(chainId);
  return rpcUrls.length > 0 && rpcUrls.every(url => isKnownBrowserUnsafePublicRpcUrl(chainId, url));
}

function getTransportRpcUrlsForChainId(chainId: number) {
  const rpcUrls = getRpcUrlsForChainId(chainId);
  const safeRpcUrls = rpcUrls.filter(url => !isKnownBrowserUnsafePublicRpcUrl(chainId, url));

  return safeRpcUrls.length ? safeRpcUrls : rpcUrls;
}

export function createHttpTransportForChainId(chainId: number) {
  const rpcTransports = getTransportRpcUrlsForChainId(chainId).map(url => http(url, { retryCount: 0 }));

  return rpcTransports.length === 1 ? rpcTransports[0] : fallback(rpcTransports, { rank: false, retryCount: 0 });
}
