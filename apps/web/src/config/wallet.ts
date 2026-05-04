import { getDefaultConfig, type WalletList } from "@rainbow-me/rainbowkit";
import {
  baseAccount,
  injectedWallet,
  metaMaskWallet,
  rainbowWallet,
  safeWallet,
  walletConnectWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { arbitrumSepolia, foundry } from "wagmi/chains";
import { appEnv } from "./env";
import { createHttpTransportForChainId } from "../protocol/rpc";

const baseChains = [arbitrumSepolia] as const;
const devChains = appEnv.enableTestnets ? ([...baseChains, foundry] as const) : baseChains;
const walletConnectEnabled = Boolean(appEnv.walletConnectProjectId);
const wallets = [
  {
    groupName: "Popular",
    wallets: walletConnectEnabled
      ? [safeWallet, rainbowWallet, baseAccount, metaMaskWallet, walletConnectWallet]
      : [injectedWallet, safeWallet],
  },
] satisfies WalletList;

export const supportedChains = devChains;

export const wagmiConfig = getDefaultConfig({
  appName: appEnv.appName,
  projectId: appEnv.walletConnectProjectId || "walletconnect-disabled",
  wallets,
  chains: supportedChains,
  transports: Object.fromEntries(supportedChains.map(chain => [chain.id, createHttpTransportForChainId(chain.id)])),
  ssr: false,
});
