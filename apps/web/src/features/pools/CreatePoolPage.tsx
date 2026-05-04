import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { type Address } from "viem";
import { useAccount } from "wagmi";
import { TransactionSteps } from "../../components/TransactionSteps";
import { useCreatePool } from "../../hooks/useCreatePool";
import { useProtocolChain } from "../../hooks/useProtocolChain";
import { FACTORY_ABI, ERC20_METADATA_ABI } from "../../protocol/abi";
import { getProtocolReadClient } from "../../protocol/networks";

export function CreatePoolPage() {
  const { activeProtocolChain } = useProtocolChain();
  const chainId = activeProtocolChain.id;
  const { isConnected } = useAccount();
  const navigate = useNavigate();
  const { createPool, isCreating, steps } = useCreatePool();

  const [shieldedToken, setShieldedToken] = useState("");
  const [backingToken, setBackingToken] = useState("");
  const [commissionRate, setCommissionRate] = useState("100");
  const [poolFee, setPoolFee] = useState("50");
  const [collateralRatio, setCollateralRatio] = useState("15000");

  const { data: whitelistedTokens } = useQuery({
    queryKey: ["whitelisted-tokens", chainId],
    queryFn: async () => {
      const client = getProtocolReadClient(chainId);
      const tokens = (await client.readContract({
        address: activeProtocolChain.deployment.factory,
        abi: FACTORY_ABI,
        functionName: "getWhitelistedTokens",
      })) as Address[];

      const symbolResults = await client.multicall({
        allowFailure: true,
        contracts: tokens.map(address => ({
          address,
          abi: ERC20_METADATA_ABI,
          functionName: "symbol" as const,
        })),
      });

      return tokens.map((address, i) => ({
        address,
        symbol: symbolResults[i]?.status === "success" ? (symbolResults[i].result as string) : address.slice(0, 8),
      }));
    },
  });

  async function handleCreate() {
    if (!shieldedToken || !backingToken) return;

    const shieldedInfo = whitelistedTokens?.find(t => t.address === shieldedToken);
    const backingInfo = whitelistedTokens?.find(t => t.address === backingToken);

    try {
      await createPool({
        shieldedToken: shieldedToken as Address,
        shieldedTokenSymbol: shieldedInfo?.symbol ?? "???",
        backingToken: backingToken as Address,
        backingTokenSymbol: backingInfo?.symbol ?? "???",
        commissionRate: BigInt(commissionRate),
        poolFee: BigInt(poolFee),
        collateralRatio: BigInt(collateralRatio),
      });
      navigate("/dashboard");
    } catch {
      // Handled by hook
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Create Pool</h1>
          <p className="text-base-content/60 mt-1">
            Deploy a new protection pool on {activeProtocolChain.label}.
          </p>
        </div>

        <div className="card bg-base-200">
          <div className="card-body space-y-4">
            {/* Token selection */}
            <div className="space-y-1">
              <label className="text-sm font-medium">Shielded Token (yield-bearing)</label>
              <select
                className="select select-bordered w-full"
                value={shieldedToken}
                onChange={e => setShieldedToken(e.target.value)}
                disabled={isCreating}
              >
                <option value="">Select token</option>
                {whitelistedTokens?.map(t => (
                  <option key={t.address} value={t.address}>
                    {t.symbol} ({t.address.slice(0, 8)}...)
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Backing Token (collateral)</label>
              <select
                className="select select-bordered w-full"
                value={backingToken}
                onChange={e => setBackingToken(e.target.value)}
                disabled={isCreating}
              >
                <option value="">Select token</option>
                {whitelistedTokens
                  ?.filter(t => t.address !== shieldedToken)
                  .map(t => (
                    <option key={t.address} value={t.address}>
                      {t.symbol} ({t.address.slice(0, 8)}...)
                    </option>
                  ))}
              </select>
            </div>

            {/* Fee configuration */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">Commission Rate (BPS)</label>
                <input
                  type="number"
                  className="input input-bordered w-full"
                  value={commissionRate}
                  onChange={e => setCommissionRate(e.target.value)}
                  disabled={isCreating}
                  min="0"
                  max="10000"
                />
                <div className="text-xs text-base-content/50">{(Number(commissionRate) / 100).toFixed(2)}%</div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Pool Fee (BPS)</label>
                <input
                  type="number"
                  className="input input-bordered w-full"
                  value={poolFee}
                  onChange={e => setPoolFee(e.target.value)}
                  disabled={isCreating}
                  min="0"
                  max="10000"
                />
                <div className="text-xs text-base-content/50">{(Number(poolFee) / 100).toFixed(2)}%</div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Collateral Ratio (BPS)</label>
              <input
                type="number"
                className="input input-bordered w-full"
                value={collateralRatio}
                onChange={e => setCollateralRatio(e.target.value)}
                disabled={isCreating}
                min="10000"
                max="50000"
              />
              <div className="text-xs text-base-content/50">{(Number(collateralRatio) / 100).toFixed(2)}%</div>
            </div>

            {isCreating && (
              <div className="card bg-base-100 p-4">
                <TransactionSteps steps={steps} />
              </div>
            )}

            <button
              className="btn btn-primary w-full"
              onClick={handleCreate}
              disabled={!isConnected || !shieldedToken || !backingToken || isCreating}
            >
              {isCreating ? "Creating Pool..." : !isConnected ? "Connect Wallet" : "Create Pool"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
