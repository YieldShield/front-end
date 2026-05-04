export type PointsSqdConfig = {
  chainId: number;
  rpcUrl: string;
  snapshotOutputDir: string;
  factory: {
    address: string;
    startBlock: number;
  };
  pool: {
    startBlock: number;
  };
  governor: {
    address: string;
    startBlock: number;
  };
};

const CHAIN_DEFAULTS: Record<number, Omit<PointsSqdConfig, "rpcUrl" | "snapshotOutputDir">> = {
  421614: {
    chainId: 421614,
    factory: {
      address: "0x755C9bd97B882278E3d19D2A1e31ad522C3f6483",
      startBlock: 255014282,
    },
    pool: {
      startBlock: 255014282,
    },
    governor: {
      address: "0x6E6d60fAc4FE03279652fe28ea7d837E51e091Ca",
      startBlock: 247304694,
    },
  },
  31337: {
    chainId: 31337,
    factory: {
      address: "0xfC8d2a49bFa827605Ed7dC01317fA9D9cC1bf3bB",
      startBlock: 0,
    },
    pool: {
      startBlock: 0,
    },
    governor: {
      address: "0x12061Cc3c316C680723F0781bBD6FC5c16C4bB40",
      startBlock: 0,
    },
  },
};

export function readPointsSqdConfig(env: Record<string, string | undefined>): PointsSqdConfig {
  const chainId = Number(env.CHAIN_ID ?? "421614");
  const defaults = CHAIN_DEFAULTS[chainId] ?? CHAIN_DEFAULTS[421614];

  return {
    chainId,
    rpcUrl: env.RPC_URL ?? "",
    snapshotOutputDir: env.SNAPSHOT_OUTPUT_DIR ?? "./dist/snapshots",
    factory: {
      address: env.FACTORY_ADDRESS ?? defaults.factory.address,
      startBlock: Number(env.FACTORY_START_BLOCK ?? defaults.factory.startBlock),
    },
    pool: {
      startBlock: Number(env.POOL_START_BLOCK ?? defaults.pool.startBlock),
    },
    governor: {
      address: env.GOVERNOR_ADDRESS ?? defaults.governor.address,
      startBlock: Number(env.GOVERNOR_START_BLOCK ?? defaults.governor.startBlock),
    },
  };
}
