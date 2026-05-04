function readEnv(name: string) {
  const value = import.meta.env[name];
  return typeof value === "string" ? value.trim() : "";
}

function readEnvList(name: string) {
  return readEnv(name)
    .split(",")
    .map(value => value.trim())
    .filter(Boolean);
}

function uniqueValues(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function readEnvNumber(name: string) {
  const value = readEnv(name);
  return value ? Number(value) : undefined;
}

function normalizeWalletConnectProjectId(value: string) {
  const placeholderValues = new Set(["YOUR_PROJECT_ID", "00000000000000000000000000000000"]);
  return placeholderValues.has(value) ? "" : value;
}

export const appEnv = {
  appName: "YieldShield",
  walletConnectProjectId: normalizeWalletConnectProjectId(readEnv("VITE_WALLETCONNECT_PROJECT_ID")),
  defaultChain: readEnv("VITE_DEFAULT_CHAIN") || "arbitrumSepolia",
  rpcUrl421614: readEnv("VITE_RPC_URL_421614"),
  rpcUrls421614: uniqueValues([readEnv("VITE_RPC_URL_421614"), ...readEnvList("VITE_RPC_URLS_421614")]),
  rpcUrl31337: readEnv("VITE_RPC_URL_31337"),
  pointsProvider: readEnv("VITE_POINTS_PROVIDER"),
  pointsBrowserFromBlock: readEnvNumber("VITE_POINTS_BROWSER_FROM_BLOCK"),
  pointsBrowserFinalityConfirmations: readEnvNumber("VITE_POINTS_BROWSER_FINALITY_CONFIRMATIONS"),
  pointsBrowserBlockChunkSize: readEnvNumber("VITE_POINTS_BROWSER_BLOCK_CHUNK_SIZE"),
  pointsBrowserPoolAddressChunkSize: readEnvNumber("VITE_POINTS_BROWSER_POOL_ADDRESS_CHUNK_SIZE"),
  pointsBrowserScanTimeoutMs: readEnvNumber("VITE_POINTS_BROWSER_SCAN_TIMEOUT_MS"),
  pointsBrowserCache: readEnv("VITE_POINTS_BROWSER_CACHE") !== "false",
  pointsGraphqlUrl: readEnv("VITE_POINTS_GRAPHQL_URL") || readEnv("VITE_PONDER_GRAPHQL_URL"),
  pointsSnapshotBaseUrl: readEnv("VITE_POINTS_SNAPSHOT_BASE_URL"),
  pointsSnapshotManifestUrl: readEnv("VITE_POINTS_SNAPSHOT_MANIFEST_URL"),
  pointsSnapshotCid: readEnv("VITE_POINTS_SNAPSHOT_CID"),
  pointsSnapshotGateways: readEnvList("VITE_POINTS_SNAPSHOT_GATEWAYS"),
  pointsSnapshotDnslinkName: readEnv("VITE_POINTS_SNAPSHOT_DNSLINK_NAME") || readEnv("VITE_POINTS_SNAPSHOT_DNSLINK_DOMAIN"),
  pointsSnapshotDnslinkGateways: readEnvList("VITE_POINTS_SNAPSHOT_DNSLINK_GATEWAYS"),
  pointsSnapshotExpectedChainId: readEnvNumber("VITE_POINTS_SNAPSHOT_EXPECTED_CHAIN_ID"),
  pointsSnapshotRegistryAddress: readEnv("VITE_POINTS_SNAPSHOT_REGISTRY_ADDRESS"),
  pointsSnapshotRegistryChainId: readEnvNumber("VITE_POINTS_SNAPSHOT_REGISTRY_CHAIN_ID"),
  pointsSnapshotAllowedSigners: readEnvList("VITE_POINTS_SNAPSHOT_ALLOWED_SIGNERS"),
  pointsSnapshotSignatureThreshold: readEnvNumber("VITE_POINTS_SNAPSHOT_SIGNATURE_THRESHOLD") ?? 0,
  pointsSnapshotVerifyHashes: readEnv("VITE_POINTS_SNAPSHOT_VERIFY_HASHES") !== "false",
  ponderGraphqlUrl: readEnv("VITE_PONDER_GRAPHQL_URL"),
  ponderApiUrl: readEnv("VITE_PONDER_API_URL"),
  enableTestnets: readEnv("VITE_ENABLE_TESTNETS") !== "false",
};
