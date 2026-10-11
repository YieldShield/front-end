import { describe, expect, it } from "vitest";
import { decodeFunctionResult, encodeFunctionData, encodeFunctionResult, type Address } from "viem";
import { LEGACY_FACTORY_ABI, LEGACY_POOL_ABI } from "./legacy-abi";
import { FACTORY_ABI, POOL_ABI } from "./abi";
const address = (n: number) => `0x${n.toString(16).padStart(40, "0")}` as Address;

describe("current smart-contracts compatibility", () => {
  it("preserves the separate legacy creation and receipt interfaces", () => {
    expect(LEGACY_FACTORY_ABI.find((x) => x.name === "createPool")?.inputs).toHaveLength(7);
    expect(FACTORY_ABI.find((x) => x.name === "createPool")?.inputs).toHaveLength(8);
    const legacy = LEGACY_POOL_ABI.find((x) => x.name === "getShieldDepositInfo");
    expect(legacy && "outputs" in legacy && legacy.outputs).toHaveLength(5);
  });
  it("includes a backing-token creation bond in factory calldata", () => {
    const encoded = encodeFunctionData({
      abi: FACTORY_ABI,
      functionName: "createPool",
      args: [address(1), "A", address(2), "B", 500n, 200n, 15000n, 500000000n],
    });
    expect(encoded).toBe(
      encodeFunctionData({
        abi: [
          {
            type: "function",
            name: "createPool",
            stateMutability: "nonpayable",
            inputs: [
              "address",
              "string",
              "address",
              "string",
              "uint256",
              "uint256",
              "uint256",
              "uint256",
            ].map((type) => ({ type })),
            outputs: [{ type: "address" }],
          },
        ],
        functionName: "createPool",
        args: [address(1), "A", address(2), "B", 500n, 200n, 15000n, 500000000n],
      }),
    );
  });
  it("decodes the four values returned for a shield receipt", () => {
    const data = encodeFunctionResult({
      abi: POOL_ABI,
      functionName: "getShieldDepositInfo",
      result: [1n, 2n, 3n, 4n],
    });
    expect(
      decodeFunctionResult({ abi: POOL_ABI, functionName: "getShieldDepositInfo", data }),
    ).toEqual([1n, 2n, 3n, 4n]);
    expect(data.length).toBe(2 + 4 * 64);
  });
});
