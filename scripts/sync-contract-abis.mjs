import { readFileSync, writeFileSync } from "node:fs";
import { format, resolveConfig } from "prettier";
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = resolve(root, process.env.YS_EVM_OUT_DIR ?? "../smart-contracts/out");
const revision = execFileSync("git", ["-C", dirname(out), "rev-parse", "HEAD"], {
  encoding: "utf8",
}).trim();
const readAbi = (name) =>
  JSON.parse(readFileSync(resolve(out, `${name}.sol/${name}.json`), "utf8")).abi;
const selections = JSON.parse(
  readFileSync(resolve(root, "scripts/contract-abi-selections.json"), "utf8"),
);
const path = resolve(root, "apps/web/src/protocol/abi.ts");
const source = readFileSync(path, "utf8");
const updated = source.replace(/export const (\w+) = ([\s\S]*?) as const;/g, (text, name, raw) => {
  if (name === "GOVERNOR_PROPOSAL_CREATED_EVENT") {
    return `export const ${name} = ${JSON.stringify(
      readAbi("YSGovernor").find((x) => x.name === "ProposalCreated"),
      null,
      2,
    )} as const;`;
  }
  if (!selections[name]) return text;
  const { contract, entries } = selections[name];
  const canonical = [
    ...new Map(readAbi(contract).map((entry) => [JSON.stringify(entry), entry])).values(),
  ];
  const inputType = (input) =>
    input.type.startsWith("tuple")
      ? `(${input.components.map(inputType).join(",")})${input.type.slice(5)}`
      : input.type;
  const selected = entries.map((entry) => {
    const matches = canonical.filter(
      (item) =>
        item.type === entry.type &&
        item.name === entry.name &&
        JSON.stringify((item.inputs ?? []).map(inputType)) === JSON.stringify(entry.inputs),
    );
    if (matches.length !== 1)
      throw new Error(`Expected one ${contract}.${entry.name}(${entry.inputs.join(",")})`);
    return matches[0];
  });
  return `export const ${name} = ${JSON.stringify(selected, null, 2)} as const;`;
});
writeFileSync(
  path,
  await format(updated, { ...(await resolveConfig(path)), parser: "typescript" }),
);
for (const name of ["SplitRiskPool", "SplitRiskPoolFactory", "YSGovernor"]) {
  const path = resolve(root, `packages/points-sqd/abis/${name}.json`);
  const events = JSON.parse(readFileSync(path, "utf8")).map((x) => x.name);
  const selected = events.map((event) =>
    readAbi(name).find((x) => x.type === "event" && x.name === event),
  );
  if (selected.some((entry) => !entry)) throw new Error(`Missing ${name} event`);
  writeFileSync(path, JSON.stringify(selected, null, 2) + "\n");
}
writeFileSync(
  resolve(root, "smart-contracts-source.json"),
  JSON.stringify(
    {
      repository: "https://github.com/YieldShield/smart-contracts",
      revision,
      scope:
        "ABI compatibility only; configured deployment addresses and deployed bytecode are unchanged",
    },
    null,
    2,
  ) + "\n",
);
console.log(`Updated contract ABI subsets from ${revision}`);
