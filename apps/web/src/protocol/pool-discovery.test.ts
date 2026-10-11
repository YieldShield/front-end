import { describe, expect, it, vi } from "vitest";
import type { Address } from "viem";
const { readContract } = vi.hoisted(() => ({ readContract: vi.fn() }));
vi.mock("./networks", () => ({
  getProtocolChainById: () => ({
    contractVersion: "current",
    deployment: { factory: "0x0000000000000000000000000000000000000001" },
  }),
  getProtocolReadClient: () => ({ readContract }),
}));
import { discoverPoolAddresses } from "./pools";
const address = (n: number) => `0x${n.toString(16).padStart(40, "0")}` as Address;
describe("historical pool discovery", () => {
  it("discovers historical pools beyond the former 256-pool scan cap", async () => {
    const pools = Array.from({ length: 257 }, (_, i) => address(i + 1));
    readContract.mockImplementation(async ({ functionName, args }) => {
      if (functionName === "poolCount") return 257n;
      if (functionName === "getPools")
        return pools.slice(Number(args[0]), Number(args[0] + args[1]));
      throw new Error("Unexpected legacy selector");
    });
    expect(await discoverPoolAddresses(46630)).toEqual(pools);
    expect(readContract).toHaveBeenCalledTimes(4);
  });
});
