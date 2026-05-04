import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchBrowserWalletPointsSnapshot } from "./browser-log-scanner";
import { getDefaultProtocolChain, getProtocolChainById, getProtocolReadClient } from "../networks";
import { readBrowserWalletPointsCache, writeBrowserWalletPointsCache } from "./browser-cache";

vi.mock("../networks", () => ({
  getDefaultProtocolChain: vi.fn(),
  getProtocolChainById: vi.fn(),
  getProtocolReadClient: vi.fn(),
}));

vi.mock("../rpc", () => ({
  getRpcResolutionForChainId: vi.fn(() => ({ source: "env" })),
  isKnownBrowserUnsafePublicRpcForChainId: vi.fn(() => false),
}));

vi.mock("./browser-cache", () => ({
  getBrowserWalletPointsCacheKey: vi.fn(() => "points-cache-key"),
  readBrowserWalletPointsCache: vi.fn(),
  writeBrowserWalletPointsCache: vi.fn(),
}));

const userAddress = "0x0000000000000000000000000000000000000001";
const factoryAddress = "0x00000000000000000000000000000000000000fa";

function createProtocolChain() {
  return {
    id: 31337,
    deployment: {
      factory: factoryAddress,
    },
  };
}

describe("fetchBrowserWalletPointsSnapshot", () => {
  beforeEach(() => {
    vi.mocked(getDefaultProtocolChain).mockReturnValue(createProtocolChain() as ReturnType<typeof getDefaultProtocolChain>);
    vi.mocked(getProtocolChainById).mockReturnValue(createProtocolChain() as ReturnType<typeof getProtocolChainById>);
    vi.mocked(readBrowserWalletPointsCache).mockReturnValue(null);
    vi.mocked(writeBrowserWalletPointsCache).mockReset();
  });

  it("resolves an empty wallet scan as a zero-points snapshot", async () => {
    const client = {
      getBlockNumber: vi.fn().mockResolvedValue(120n),
      getBlock: vi.fn().mockResolvedValue({ timestamp: 1_775_000_000n }),
      request: vi.fn().mockResolvedValue([]),
    };
    vi.mocked(getProtocolReadClient).mockReturnValue(client as unknown as ReturnType<typeof getProtocolReadClient>);

    const snapshot = await fetchBrowserWalletPointsSnapshot(userAddress, {
      chainId: 31337,
      fromBlock: 100,
      finalityConfirmations: 0,
      blockChunkSize: 50,
      cache: false,
    });

    expect(snapshot).toMatchObject({
      user: null,
      rank: null,
      streak: null,
      questCompletions: [],
      metadata: {
        chainId: 31337,
        fromBlock: 100,
        finalizedBlockNumber: 120,
      },
    });
    expect(client.request).toHaveBeenCalledTimes(1);
    expect(writeBrowserWalletPointsCache).not.toHaveBeenCalled();
  });
});
