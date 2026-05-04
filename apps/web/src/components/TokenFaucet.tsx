import { useEffect, useMemo, useState } from "react";
import { type Address, formatEther } from "viem";
import { useAccount, useReadContract } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { FAUCET_ABI, ERC20_ABI, ERC20_METADATA_ABI } from "../protocol/abi";
import { useProtocolChain } from "../hooks/useProtocolChain";
import { useProtocolWrite } from "../hooks/useProtocolWrite";
import { formatAddress } from "../protocol/format";

const DRIP_AMOUNT = 100n * 10n ** 18n;

function TokenItem({
  tokenAddress,
  faucetAddress,
  userAddress,
  onDrip,
  isLoading,
}: {
  tokenAddress: Address;
  faucetAddress: Address;
  userAddress: Address;
  onDrip: () => void;
  isLoading: boolean;
}) {
  const { data: tokenSymbol } = useReadContract({
    address: tokenAddress,
    abi: ERC20_METADATA_ABI,
    functionName: "symbol",
  });

  const { data: faucetBalance, refetch: refetchFaucetBalance } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [faucetAddress],
    query: { refetchInterval: 10_000 },
  });

  const { data: userBalance } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [userAddress],
    query: { refetchInterval: 10_000 },
  });

  const { data: canDripData, refetch: refetchCanDrip } = useReadContract({
    address: faucetAddress,
    abi: FAUCET_ABI,
    functionName: "canDrip",
    args: [tokenAddress, userAddress],
    query: { refetchInterval: 5_000 },
  });

  const canDrip = (canDripData as [boolean, bigint] | undefined)?.[0] ?? false;
  const nextDripTime = (canDripData as [boolean, bigint] | undefined)?.[1] ?? 0n;
  const hasFaucetBalance = faucetBalance != null && (faucetBalance as bigint) >= DRIP_AMOUNT;

  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  // Tick every second for countdown
  useEffect(() => {
    if (canDrip || nextDripTime === 0n) return;
    const interval = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(interval);
  }, [canDrip, nextDripTime]);

  const timeUntilNextDrip = useMemo(() => {
    if (!nextDripTime || nextDripTime === 0n) return null;
    const remaining = Number(nextDripTime) - now;
    if (remaining <= 0) return null;
    return {
      hours: Math.floor(remaining / 3600),
      minutes: Math.floor((remaining % 3600) / 60),
      seconds: remaining % 60,
    };
  }, [nextDripTime, now]);

  const formatBalance = (balance: unknown) => {
    if (!balance) return "0";
    return parseFloat(formatEther(balance as bigint)).toLocaleString();
  };

  useEffect(() => {
    if (!isLoading) {
      refetchFaucetBalance();
      refetchCanDrip();
    }
  }, [isLoading, refetchFaucetBalance, refetchCanDrip]);

  const symbol = (tokenSymbol as string) || "???";

  return (
    <div className="border border-base-300 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h4 className="font-bold text-lg">{symbol}</h4>
          <span className="text-sm text-font-grey">{formatAddress(tokenAddress)}</span>
          <button
            className="btn btn-ghost btn-xs"
            onClick={() => {
              navigator.clipboard.writeText(tokenAddress);
              toast.success("Copied!");
            }}
          >
            Copy
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-base-content/70">Faucet Balance:</span>
          <div className="font-bold">{formatBalance(faucetBalance)} tokens</div>
        </div>
        <div>
          <span className="text-base-content/70">Your Balance:</span>
          <div className="font-bold">{formatBalance(userBalance)} tokens</div>
        </div>
      </div>

      {timeUntilNextDrip && !canDrip && (
        <div className="alert alert-warning py-2">
          <span className="text-sm">
            Next request available in: {timeUntilNextDrip.hours}h {timeUntilNextDrip.minutes}m{" "}
            {timeUntilNextDrip.seconds}s
          </span>
        </div>
      )}

      <button
        className="btn btn-secondary w-full"
        onClick={onDrip}
        disabled={!canDrip || !hasFaucetBalance || isLoading}
      >
        {isLoading ? (
          <span className="loading loading-spinner loading-sm" />
        ) : !hasFaucetBalance ? (
          "Faucet Empty"
        ) : !canDrip ? (
          "Rate Limited"
        ) : (
          <>Request 100 {symbol}</>
        )}
      </button>
    </div>
  );
}

export function TokenFaucet() {
  const { address: connectedAddress } = useAccount();
  const { activeProtocolChain } = useProtocolChain();
  const deployment = activeProtocolChain.deployment as Record<string, Address | undefined>;
  const faucetAddress = deployment.mockTokenFaucet;
  const queryClient = useQueryClient();

  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});

  const { data: allTokens } = useReadContract({
    address: faucetAddress,
    abi: FAUCET_ABI,
    functionName: "getAllTokens",
    query: { enabled: !!faucetAddress },
  });

  const { writeContractAsync } = useProtocolWrite();

  // Don't render if no faucet, no wallet, or no tokens
  if (!faucetAddress || !connectedAddress || !allTokens) return null;

  const tokens = allTokens as Address[];

  const handleDrip = async (tokenAddress: Address) => {
    try {
      setLoadingStates(prev => ({ ...prev, [tokenAddress]: true }));
      await writeContractAsync({
        address: faucetAddress,
        abi: FAUCET_ABI,
        functionName: "drip",
        args: [tokenAddress, connectedAddress],
      });
      toast.success("Tokens received!");
      queryClient.invalidateQueries({ queryKey: ["readContract"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to request tokens");
    } finally {
      setLoadingStates(prev => ({ ...prev, [tokenAddress]: false }));
    }
  };

  const handleDripAll = async () => {
    try {
      setLoadingStates(prev => ({ ...prev, dripAll: true }));
      await writeContractAsync({
        address: faucetAddress,
        abi: FAUCET_ABI,
        functionName: "dripAll",
        args: [connectedAddress],
      });
      toast.success("All tokens received!");
      queryClient.invalidateQueries({ queryKey: ["readContract"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to request tokens");
    } finally {
      setLoadingStates(prev => ({ ...prev, dripAll: false }));
    }
  };

  return (
    <div>
      <label htmlFor="token-faucet-modal" className="btn btn-primary btn-sm font-normal gap-1 cursor-pointer">
        Token Faucet
      </label>
      <input type="checkbox" id="token-faucet-modal" className="modal-toggle" />
      <label htmlFor="token-faucet-modal" className="modal cursor-pointer">
        <label className="modal-box relative max-w-3xl">
          <label htmlFor="token-faucet-modal" className="btn btn-ghost btn-sm btn-circle absolute right-3 top-3">
            ✕
          </label>
          <h3 className="text-xl font-bold mb-3">Token Faucet</h3>

          <div className="space-y-4">
            <p className="text-sm text-base-content/70">
              Request test tokens for testing. Each token can be requested once every 24 hours.
            </p>

            {tokens.length > 0 && (
              <div className="mb-4">
                <button
                  className="btn btn-primary w-full"
                  onClick={handleDripAll}
                  disabled={loadingStates.dripAll}
                >
                  {loadingStates.dripAll ? (
                    <span className="loading loading-spinner loading-sm" />
                  ) : (
                    "Request All Tokens"
                  )}
                </button>
              </div>
            )}

            <div className="space-y-3">
              {tokens.length > 0 ? (
                tokens.map(tokenAddress => (
                  <TokenItem
                    key={tokenAddress}
                    tokenAddress={tokenAddress}
                    faucetAddress={faucetAddress}
                    userAddress={connectedAddress}
                    onDrip={() => handleDrip(tokenAddress)}
                    isLoading={loadingStates[tokenAddress] || false}
                  />
                ))
              ) : (
                <div className="text-center py-8 text-base-content/50">No tokens available in faucet</div>
              )}
            </div>
          </div>
        </label>
      </label>
    </div>
  );
}
