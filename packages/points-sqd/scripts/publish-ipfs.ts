import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { stageSnapshotForIpfs } from "../src/export/stage-ipfs-snapshot.js";

type CliOptions = {
  dir: string;
  ipfsBin: string;
  pin: boolean;
};

function readFlag(name: string) {
  const flagIndex = process.argv.indexOf(name);
  if (flagIndex === -1) {
    return "";
  }

  return process.argv[flagIndex + 1] ?? "";
}

function hasFlag(name: string) {
  return process.argv.includes(name);
}

function parseCliOptions(): CliOptions {
  const dir = resolve(process.env.INIT_CWD ?? process.cwd(), readFlag("--dir") || "./dist/snapshots");

  if (!existsSync(dir)) {
    throw new Error(`Snapshot directory does not exist: ${dir}`);
  }

  if (!existsSync(resolve(dir, "manifest.json"))) {
    throw new Error(`Snapshot directory is missing manifest.json: ${dir}`);
  }

  return {
    dir,
    ipfsBin: readFlag("--ipfs-bin") || process.env.IPFS_BIN || "ipfs",
    pin: !hasFlag("--no-pin"),
  };
}

function runIpfsAdd(options: CliOptions) {
  return new Promise<string[]>((resolvePromise, reject) => {
    const args = [
      "add",
      "-r",
      "--cid-version=1",
      "--quieter",
      `--pin=${options.pin ? "true" : "false"}`,
      options.dir,
    ];
    const child = spawn(options.ipfsBin, args, {
      stdio: ["ignore", "pipe", "pipe"],
    });
    const stdout: string[] = [];
    const stderr: string[] = [];

    child.stdout.on("data", chunk => stdout.push(String(chunk)));
    child.stderr.on("data", chunk => stderr.push(String(chunk)));
    child.on("error", reject);
    child.on("close", code => {
      if (code === 0) {
        resolvePromise(stdout.join("").split(/\r?\n/).filter(Boolean));
        return;
      }

      reject(new Error(`ipfs add failed with code ${code ?? "unknown"}:\n${stderr.join("")}`));
    });
  });
}

const options = parseCliOptions();
const stagedSnapshot = await stageSnapshotForIpfs(options.dir);

try {
  const cids = await runIpfsAdd({
    ...options,
    dir: stagedSnapshot.stagingDir,
  });
  const rootCid = cids.at(-1);

  if (!rootCid) {
    throw new Error("ipfs add did not return a CID");
  }

  process.stdout.write(`Published ${options.dir}\nSnapshot CID: ${rootCid}\n`);
} finally {
  await stagedSnapshot.cleanup();
}
