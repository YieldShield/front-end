import { describe, expect, it } from "vitest";
import { getDnslinkGatewayBaseUrls, getSnapshotSources } from "./snapshot-urls";

describe("getDnslinkGatewayBaseUrls", () => {
  it("uses IPNS gateway paths for the default DNSLink gateways", () => {
    expect(getDnslinkGatewayBaseUrls("points.yieldshield.example")).toEqual([
      "https://dweb.link/ipns/points.yieldshield.example",
      "https://ipfs.io/ipns/points.yieldshield.example",
    ]);
  });

  it("supports custom gateway templates with name and dnslink placeholders", () => {
    expect(
      getDnslinkGatewayBaseUrls("points.yieldshield.example", [
        "https://gateway.example/ipns/{name}/",
        "https://backup.example/dnslink/{dnslink}",
        "https://plain.example/ipns",
      ]),
    ).toEqual([
      "https://gateway.example/ipns/points.yieldshield.example",
      "https://backup.example/dnslink/points.yieldshield.example",
      "https://plain.example/ipns/points.yieldshield.example",
    ]);
  });
});

describe("getSnapshotSources", () => {
  it("orders registry, manifest, DNSLink, CID, then base URL sources", () => {
    expect(
      getSnapshotSources({
        registryCid: "bafy-registry",
        manifestUrl: "https://snapshots.example/manifest.json",
        dnslinkName: "points.yieldshield.example",
        dnslinkGateways: ["https://dweb.link/ipns/{name}"],
        cid: "bafy-fixed",
        gateways: ["https://ipfs.io/ipfs/{cid}"],
        baseUrl: "https://snapshots.example/base",
      }),
    ).toEqual([
      {
        kind: "cid",
        cid: "bafy-registry",
        gateways: ["https://ipfs.io/ipfs/{cid}"],
      },
      {
        kind: "manifest",
        manifestUrl: "https://snapshots.example/manifest.json",
      },
      {
        kind: "dnslink",
        name: "points.yieldshield.example",
        gateways: ["https://dweb.link/ipns/{name}"],
      },
      {
        kind: "cid",
        cid: "bafy-fixed",
        gateways: ["https://ipfs.io/ipfs/{cid}"],
      },
      {
        kind: "base",
        baseUrl: "https://snapshots.example/base",
      },
    ]);
  });
});
