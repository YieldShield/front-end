import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Address, Hash } from "viem";

const mocks = vi.hoisted(() => ({
  version: "current",
  balance: 20_000_000n,
  allowance: 3_000_000n,
  bondValueUsd: 600_00000000n,
  readContract: vi.fn(),
  simulateContract: vi.fn(),
  writeContractAsync: vi.fn(),
  waitForTransactionReceipt: vi.fn(),
  invalidateQueries: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));
// Exercise the hook's async transaction path without mounting a browser or wallet.
vi.mock("react", () => ({
  useCallback: (callback: unknown) => callback,
  useState: (value: unknown) => [value, vi.fn()],
}));
vi.mock("wagmi", () => ({
  useAccount: () => ({ address: "0x0000000000000000000000000000000000000001" }),
}));
vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: mocks.invalidateQueries }),
}));
vi.mock("react-hot-toast", () => ({ default: { success: mocks.success, error: mocks.error } }));
vi.mock("./useProtocolChain", () => ({
  useProtocolChain: () => ({
    activeProtocolChain: {
      id: 31337,
      contractVersion: mocks.version,
      deployment: { factory: "0x0000000000000000000000000000000000000002" },
    },
  }),
}));
vi.mock("./useProtocolWrite", () => ({
  useProtocolWrite: () => ({ writeContractAsync: mocks.writeContractAsync }),
}));
vi.mock("../protocol/networks", () => ({
  getProtocolReadClient: () => ({
    readContract: mocks.readContract,
    simulateContract: mocks.simulateContract,
    waitForTransactionReceipt: mocks.waitForTransactionReceipt,
  }),
}));
import { useCreatePool } from "./useCreatePool";

const address = (n: number) => `0x${n.toString(16).padStart(40, "0")}` as Address;
const hash = (n: number) => `0x${n.toString(16).padStart(64, "0")}` as Hash;
const params = {
  shieldedToken: address(3),
  shieldedTokenSymbol: "SHIELD",
  backingToken: address(4),
  backingTokenSymbol: "BACK",
  commissionRate: 500n,
  poolFee: 200n,
  collateralRatio: 15000n,
  creationBondAmount: "10",
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.version = "current";
  mocks.balance = 20_000_000n;
  mocks.allowance = 3_000_000n;
  mocks.bondValueUsd = 600_00000000n;
  mocks.readContract.mockImplementation(async ({ functionName }) => {
    switch (functionName) {
      case "decimals":
        return 6;
      case "minimumCreationBondUsd":
        return 500_00000000n;
      case "compositeOracle":
        return address(5);
      case "balanceOf":
        return mocks.balance;
      case "allowance":
        return mocks.allowance;
      case "getValue":
        return mocks.bondValueUsd;
      default:
        throw new Error(`Unexpected read ${functionName}`);
    }
  });
  mocks.writeContractAsync.mockImplementation(async () =>
    hash(mocks.writeContractAsync.mock.calls.length),
  );
  mocks.simulateContract.mockResolvedValue({});
  mocks.waitForTransactionReceipt.mockResolvedValue({ status: "success" });
  mocks.invalidateQueries.mockResolvedValue(undefined);
});

describe("createPool bond transaction flow", () => {
  it("mines an allowance reset and exact bond approval before simulation and creation", async () => {
    const receipts = new Map<Hash, (value: { status: string }) => void>();
    mocks.waitForTransactionReceipt.mockImplementation(
      ({ hash: txHash }) => new Promise((resolve) => receipts.set(txHash, resolve)),
    );
    const pending = useCreatePool().createPool(params);

    await vi.waitFor(() => expect(receipts.has(hash(1))).toBe(true));
    expect(
      mocks.writeContractAsync.mock.calls.map(([request]) => [request.functionName, request.args]),
    ).toEqual([["approve", [address(2), 0n]]]);
    expect(mocks.simulateContract).not.toHaveBeenCalled();
    receipts.get(hash(1))!({ status: "success" });

    await vi.waitFor(() => expect(receipts.has(hash(2))).toBe(true));
    expect(mocks.writeContractAsync.mock.calls[1][0]).toMatchObject({
      address: address(4),
      functionName: "approve",
      args: [address(2), 10_000_000n],
    });
    expect(mocks.simulateContract).not.toHaveBeenCalled();
    receipts.get(hash(2))!({ status: "success" });

    await vi.waitFor(() => expect(receipts.has(hash(3))).toBe(true));
    const creationArgs = [
      address(3),
      "SHIELD",
      address(4),
      "BACK",
      500n,
      200n,
      15000n,
      10_000_000n,
    ];
    expect(mocks.simulateContract).toHaveBeenCalledWith(
      expect.objectContaining({
        functionName: "createPool",
        args: creationArgs,
        account: address(1),
      }),
    );
    expect(mocks.writeContractAsync.mock.calls[2][0]).toMatchObject({
      functionName: "createPool",
      args: creationArgs,
    });
    for (const [request] of mocks.writeContractAsync.mock.calls) {
      expect(request).toMatchObject({ chainId: 31337, account: address(1) });
    }
    expect(mocks.success).not.toHaveBeenCalled();
    expect(mocks.invalidateQueries).not.toHaveBeenCalled();
    receipts.get(hash(3))!({ status: "success" });
    await expect(pending).resolves.toBe(hash(3));
    expect(mocks.success).toHaveBeenCalledWith("Pool created!");
  });

  it("rejects a bond above the token balance before asking for a signature", async () => {
    mocks.balance = 9_000_000n;
    await expect(useCreatePool().createPool(params)).rejects.toThrow("Insufficient backing tokens");
    expect(mocks.writeContractAsync).not.toHaveBeenCalled();
    expect(mocks.simulateContract).not.toHaveBeenCalled();
  });

  it("rejects a bond below the USD floor before asking for a signature", async () => {
    mocks.bondValueUsd = 499_00000000n;
    await expect(useCreatePool().createPool(params)).rejects.toThrow(
      "below the factory's required USD value",
    );
    expect(mocks.writeContractAsync).not.toHaveBeenCalled();
    expect(mocks.simulateContract).not.toHaveBeenCalled();
  });

  it("stops if an approval receipt reverts", async () => {
    mocks.waitForTransactionReceipt.mockResolvedValue({ status: "reverted" });
    await expect(useCreatePool().createPool(params)).rejects.toThrow(
      "Creation bond approval failed",
    );
    expect(mocks.writeContractAsync).toHaveBeenCalledTimes(1);
    expect(mocks.simulateContract).not.toHaveBeenCalled();
    expect(mocks.success).not.toHaveBeenCalled();
  });

  it("preserves seven-argument legacy creation without bond reads or approvals", async () => {
    mocks.version = "legacy-s1";
    await expect(useCreatePool().createPool({ ...params, creationBondAmount: "" })).resolves.toBe(
      hash(1),
    );
    expect(mocks.readContract).not.toHaveBeenCalled();
    expect(mocks.writeContractAsync).toHaveBeenCalledTimes(1);
    expect(mocks.writeContractAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        functionName: "createPool",
        args: [address(3), "SHIELD", address(4), "BACK", 500n, 200n, 15000n],
      }),
    );
    expect(mocks.waitForTransactionReceipt).toHaveBeenCalledWith({ hash: hash(1) });
  });
});
