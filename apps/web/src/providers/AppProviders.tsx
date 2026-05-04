import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, darkTheme, lightTheme } from "@rainbow-me/rainbowkit";
import { Toaster } from "react-hot-toast";
import { WagmiProvider } from "wagmi";
import { wagmiConfig } from "../config/wallet";
import { ThemeProvider, useTheme } from "./ThemeProvider";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

type AppProvidersProps = {
  children: ReactNode;
};

function WalletProviders({ children }: AppProvidersProps) {
  const { resolvedTheme } = useTheme();
  const theme =
    resolvedTheme === "dark"
      ? darkTheme({
          accentColor: "#D91BC8",
          accentColorForeground: "#FFFFFF",
          borderRadius: "medium",
          fontStack: "system",
          overlayBlur: "small",
        })
      : lightTheme({
          accentColor: "#7518A7",
          accentColorForeground: "#FFFFFF",
          borderRadius: "medium",
          fontStack: "system",
          overlayBlur: "small",
        });

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={theme} modalSize="compact">
          {children}
          <Toaster position="top-center" toastOptions={{ duration: 4000 }} />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ThemeProvider>
      <WalletProviders>{children}</WalletProviders>
    </ThemeProvider>
  );
}
