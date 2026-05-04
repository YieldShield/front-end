const DEFAULT_IPFS_GATEWAYS = ["https://ipfs.io/ipfs/{cid}", "https://dweb.link/ipfs/{cid}"];
const DEFAULT_DNSLINK_GATEWAYS = ["https://dweb.link/ipns/{name}", "https://ipfs.io/ipns/{name}"];

export type SnapshotUrlSource =
  | {
      kind: "base";
      baseUrl: string;
    }
  | {
      kind: "manifest";
      manifestUrl: string;
    }
  | {
      kind: "cid";
      cid: string;
      gateways: string[];
    }
  | {
      kind: "dnslink";
      name: string;
      gateways: string[];
    };

export function joinSnapshotUrl(baseUrl: string, path: string) {
  return `${baseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

export function getIpfsGatewayBaseUrls(cid: string, gateways: string[] = []) {
  const templates = gateways.length ? gateways : DEFAULT_IPFS_GATEWAYS;

  return templates.map(template => {
    if (template.includes("{cid}")) {
      return template.replaceAll("{cid}", cid).replace(/\/+$/, "");
    }

    return joinSnapshotUrl(template, cid);
  });
}

export function getDnslinkGatewayBaseUrls(name: string, gateways: string[] = []) {
  const templates = gateways.length ? gateways : DEFAULT_DNSLINK_GATEWAYS;

  return templates.map(template => {
    if (template.includes("{name}") || template.includes("{dnslink}")) {
      return template
        .replaceAll("{name}", name)
        .replaceAll("{dnslink}", name)
        .replace(/\/+$/, "");
    }

    return joinSnapshotUrl(template, name);
  });
}

export function getManifestUrlDirectory(manifestUrl: string) {
  return manifestUrl.replace(/\/manifest\.json(?:[?#].*)?$/, "");
}

export function getSnapshotSources(options: {
  baseUrl?: string;
  manifestUrl?: string;
  cid?: string;
  gateways?: string[];
  dnslinkName?: string;
  dnslinkGateways?: string[];
  registryCid?: string;
}) {
  const sources: SnapshotUrlSource[] = [];

  if (options.registryCid) {
    sources.push({
      kind: "cid",
      cid: options.registryCid,
      gateways: options.gateways ?? [],
    });
  }

  if (options.manifestUrl) {
    sources.push({
      kind: "manifest",
      manifestUrl: options.manifestUrl,
    });
  }

  if (options.dnslinkName) {
    sources.push({
      kind: "dnslink",
      name: options.dnslinkName,
      gateways: options.dnslinkGateways ?? [],
    });
  }

  if (options.cid) {
    sources.push({
      kind: "cid",
      cid: options.cid,
      gateways: options.gateways ?? [],
    });
  }

  if (options.baseUrl) {
    sources.push({
      kind: "base",
      baseUrl: options.baseUrl,
    });
  }

  return sources;
}
