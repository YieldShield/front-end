import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createBrowserPointsProvider } from "./provider-browser";
import { fetchBrowserWalletPointsSnapshot } from "./browser-log-scanner";

vi.mock("./browser-log-scanner", () => ({
  fetchBrowserWalletPointsSnapshot: vi.fn(),
}));

const userAddress = "0x0000000000000000000000000000000000000001";
type BrowserWalletSnapshot = Awaited<ReturnType<typeof fetchBrowserWalletPointsSnapshot>>;

function createUserSnapshot(): BrowserWalletSnapshot {
  return {
    metadata: {
      format: "yieldshield-lite/points-snapshot",
      version: 1,
      generatedAt: "2026-04-13T00:00:00.000Z",
      chainId: 421614,
      source: "browser",
      fromBlock: 1,
      finalizedBlockNumber: 2,
      finalizedBlockTimestamp: "2026-04-13T00:00:00.000Z",
      rulesVersion: "test",
      exporterVersion: "test",
    },
    user: {
      userAddress,
      totalPoints: "10",
      lastUpdated: "2026-04-13T00:00:00.000Z",
    },
    rank: null,
    streak: null,
    questCompletions: [],
  } satisfies BrowserWalletSnapshot;
}

describe("createBrowserPointsProvider", () => {
  beforeEach(() => {
    vi.mocked(fetchBrowserWalletPointsSnapshot).mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not keep a rejected wallet scan promise cached forever", async () => {
    vi.mocked(fetchBrowserWalletPointsSnapshot)
      .mockRejectedValueOnce(new Error("rpc is temporarily unavailable"))
      .mockResolvedValueOnce(createUserSnapshot());

    const provider = createBrowserPointsProvider();

    await expect(provider.fetchUserSnapshot(userAddress)).rejects.toThrow("rpc is temporarily unavailable");
    await expect(provider.fetchUserSnapshot(userAddress)).resolves.toMatchObject({
      user: {
        totalPoints: "10",
      },
    });

    expect(fetchBrowserWalletPointsSnapshot).toHaveBeenCalledTimes(2);
  });

  it("does not keep a timed-out wallet scan promise cached forever", async () => {
    vi.useFakeTimers();
    vi.mocked(fetchBrowserWalletPointsSnapshot)
      .mockImplementationOnce(() => new Promise<never>(() => {}))
      .mockResolvedValueOnce(createUserSnapshot());

    const provider = createBrowserPointsProvider({ scanTimeoutMs: 100 });
    const timedOutScan = provider.fetchUserSnapshot(userAddress);
    const timedOutExpectation = expect(timedOutScan).rejects.toThrow("Browser points scan timed out after 100ms");

    await vi.advanceTimersByTimeAsync(100);
    await timedOutExpectation;
    await expect(provider.fetchUserSnapshot(userAddress)).resolves.toMatchObject({
      user: {
        totalPoints: "10",
      },
    });

    expect(fetchBrowserWalletPointsSnapshot).toHaveBeenCalledTimes(2);
  });
});
