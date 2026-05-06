import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { POINTS_RULES_VERSION } from "@yieldshield/points-core";
import packageJson from "../package.json" with { type: "json" };
import { applyPoints, hashIndexedActions, writeSnapshots } from "../src/index.js";
import type { IndexedAction } from "../src/model/types.js";

type CliOptions = {
  inputPath: string;
  outputDir: string;
  chainId: number;
  fromBlock?: number;
  finalizedBlockNumber?: number;
  finalizedBlockTimestamp?: string;
  generatedAt?: string;
  rulesVersion: string;
  exporterVersion: string;
  rewriteUserAddress?: string;
};

function readFlag(name: string) {
  const flagIndex = process.argv.indexOf(name);
  if (flagIndex === -1) {
    return "";
  }

  return process.argv[flagIndex + 1] ?? "";
}

function parseCliOptions(): CliOptions {
  const inputPath = readFlag("--input");
  const outputDir = readFlag("--output");
  const chainId = Number(readFlag("--chain-id") || "421614");
  const fromBlockFlag = readFlag("--from-block");
  const finalizedBlockNumberFlag = readFlag("--finalized-block");
  const finalizedBlockTimestamp = readFlag("--finalized-block-timestamp");
  const generatedAt = readFlag("--generated-at");
  const rulesVersion = readFlag("--rules-version") || POINTS_RULES_VERSION;
  const exporterVersion = readFlag("--exporter-version") || packageJson.version;
  const rewriteUserAddress = readFlag("--rewrite-user-address");

  if (!inputPath) {
    throw new Error("Missing required --input <path> argument");
  }

  if (!outputDir) {
    throw new Error("Missing required --output <dir> argument");
  }

  return {
    inputPath: resolveInputPath(inputPath),
    outputDir: resolveOutputPath(outputDir),
    chainId,
    fromBlock: fromBlockFlag ? Number(fromBlockFlag) : undefined,
    finalizedBlockNumber: finalizedBlockNumberFlag ? Number(finalizedBlockNumberFlag) : undefined,
    finalizedBlockTimestamp: finalizedBlockTimestamp || undefined,
    generatedAt: generatedAt || undefined,
    rulesVersion,
    exporterVersion,
    rewriteUserAddress: rewriteUserAddress ? rewriteUserAddress.toLowerCase() : undefined,
  };
}

function resolveInputPath(inputPath: string) {
  if (inputPath.startsWith("/")) {
    return inputPath;
  }

  const cwdPath = resolve(process.cwd(), inputPath);
  if (existsSync(cwdPath)) {
    return cwdPath;
  }

  const initCwd = process.env.INIT_CWD;
  if (initCwd) {
    const initPath = resolve(initCwd, inputPath);
    if (existsSync(initPath)) {
      return initPath;
    }
  }

  return cwdPath;
}

function resolveOutputPath(outputDir: string) {
  if (outputDir.startsWith("/")) {
    return outputDir;
  }

  return resolve(process.env.INIT_CWD ?? process.cwd(), outputDir);
}

function getFromBlock(actions: IndexedAction[], fromBlock?: number) {
  if (fromBlock !== undefined) {
    return fromBlock;
  }

  const blockNumbers = actions.map(action => action.blockNumber);
  if (!blockNumbers.length) {
    throw new Error("Missing required --from-block <number> for an empty action set");
  }

  return Math.min(...blockNumbers);
}

function getFinalizedBlockNumber(actions: IndexedAction[], finalizedBlockNumber?: number) {
  if (finalizedBlockNumber !== undefined) {
    return finalizedBlockNumber;
  }

  const blockNumbers = actions.map(action => action.blockNumber);
  if (!blockNumbers.length) {
    throw new Error("Missing required --finalized-block <number> for an empty action set");
  }

  return Math.max(...blockNumbers);
}

function getFinalizedBlockTimestamp(actions: IndexedAction[], finalizedBlockTimestamp?: string) {
  if (finalizedBlockTimestamp) {
    return finalizedBlockTimestamp;
  }

  const latestAction = [...actions].sort((left, right) => left.occurredAt.localeCompare(right.occurredAt)).at(-1);
  if (!latestAction) {
    throw new Error("Missing required --finalized-block-timestamp <iso> for an empty action set");
  }

  return latestAction.occurredAt;
}

function rewriteUserAddressForSmoke(actions: IndexedAction[], userAddress?: string) {
  if (!userAddress) {
    return actions;
  }

  return actions.map(action => ({
    ...action,
    userAddress: action.userAddress ? userAddress : action.userAddress,
  }));
}

async function main() {
  const options = parseCliOptions();
  const rawActions = await readFile(options.inputPath, "utf8");
  const actions = rewriteUserAddressForSmoke(JSON.parse(rawActions) as IndexedAction[], options.rewriteUserAddress);
  const result = applyPoints(actions);
  const finalizedBlockTimestamp = getFinalizedBlockTimestamp(actions, options.finalizedBlockTimestamp);
  const generatedAt = options.generatedAt ?? finalizedBlockTimestamp;

  const snapshot = await writeSnapshots(result, {
    outputDir: options.outputDir,
    chainId: options.chainId,
    fromBlock: getFromBlock(actions, options.fromBlock),
    finalizedBlockNumber: getFinalizedBlockNumber(actions, options.finalizedBlockNumber),
    finalizedBlockTimestamp,
    generatedAt,
    rulesVersion: options.rulesVersion,
    exporterVersion: options.exporterVersion,
    actionsHash: hashIndexedActions(actions),
  });

  process.stdout.write(
    `Exported ${result.leaderboard.length} users and ${result.totalDistributedPoints.toString()} total points to ${options.outputDir}\nManifest actions hash: ${snapshot.manifest.actionsHash}\n`,
  );
}

await main();
