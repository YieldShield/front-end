# CLAUDE.md

This file provides guidance to Claude Code when working with code in this
repository.

## Project Overview

YieldShield Lite is an IPFS-first frontend for the YieldShield decentralized
balance protection protocol. It rebuilds the full YieldShield frontend
(`yieldshield/packages/nextjs`) as a static, browser-only app that can be
deployed to IPFS without any backend service or private keys.

The smart contracts live in the full monorepo (`yieldshield/packages/foundry`).
This repo contains only the frontend. The existing Ponder indexer
(`yieldshield/packages/ponder`) is reused as an external, optional service.

**Full monorepo location:** `/Users/santibalaguer/Documents/yieldshield/code/yieldshield`

**V1 specification:** `.claude/spec-v1.md` — contains the full feature scope,
architecture decisions, transaction flows, ABI surface, and implementation
order. Read this before starting any implementation work.

## Architecture

### Stack

- **Build:** Vite 8 → static `dist/` output
- **UI:** React 19, Tailwind CSS 4, DaisyUI 5
- **Routing:** react-router-dom with HashRouter (IPFS-safe deep links)
- **Wallet:** RainbowKit 2, wagmi 2, viem 2
- **Data fetching:** TanStack React Query
- **Indexed data:** Ponder GraphQL (external, optional)
- **Oracle prices:** Direct contract reads + Pyth Hermes API (browser-safe)

### IPFS Guardrails

These constraints are non-negotiable. Every piece of code must respect them:

1. **No API routes.** All data comes from RPC, public APIs, or optional Ponder.
2. **No secrets in the browser.** No private keys, no privileged API keys.
   Every external API used (Pyth Hermes, Ponder GraphQL) is public.
3. **No server-side rendering.** No request-time logic.
4. **No host-specific rewrite rules.** HashRouter handles routing.
5. **Relative asset paths.** Vite `base: "./"` for IPFS gateway compatibility.
6. **Optional enrichment only.** Core flows must work without Ponder.

### Data Sources

| Source          | Purpose                                                    | Required?        |
| --------------- | ---------------------------------------------------------- | ---------------- |
| EVM RPC         | Contract state (pools, balances, positions, oracles)       | Yes              |
| Pyth Hermes API | Price update data for oracle freshness before transactions | Yes (for writes) |
| Ponder GraphQL  | Points, leaderboard, accelerated position discovery        | No               |

### Key Architecture Decisions

- **RainbowKit** instead of Dynamic.xyz — self-hosted, no backend dependency
- **Direct viem/wagmi** instead of Scaffold-ETH hooks — smaller, no framework coupling
- **Ponder primary, on-chain fallback** for position discovery
- **Sequential two-tx pattern** for Pyth oracle freshness before transactions
- **Drawer-based modals** for all transaction flows

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Vite dev server (localhost:5173)
npm run build        # TypeScript check + Vite build → dist/
npm run preview      # Preview built dist/ locally
npm run typecheck    # TypeScript checking only
```

## Project Structure

```
apps/web/src/
├── config/           # Environment vars, wallet config, navigation
├── protocol/         # Contract interaction layer (ABIs, reads, writes)
│   ├── abi.ts        # All contract ABIs
│   ├── networks.ts   # Chain configs and deployment addresses
│   ├── rpc.ts        # RPC endpoint resolution
│   ├── pools.ts      # Pool discovery and detail fetching
│   ├── governance.ts # Governance state reads
│   ├── points.ts     # Ponder GraphQL queries for points
│   ├── oracle.ts     # Oracle price reads + Pyth freshness (V1)
│   ├── positions.ts  # Position discovery: Ponder + on-chain (V1)
│   └── format.ts     # Display formatting utilities
├── hooks/            # React hooks
├── providers/        # Context providers (Wagmi, Theme, React Query)
├── layout/           # App shell (header, footer, navigation)
├── components/       # Reusable UI components
├── features/         # Page-level feature modules
│   ├── home/         # Landing page
│   ├── dapp/         # Yield entry point and deposit flows
│   ├── pools/        # Pool browsing and detail
│   ├── governance/   # Governance overview (read-only in V1)
│   ├── points/       # Quests, streaks, leaderboard
│   └── docs/         # Feature documentation
├── styles/           # Tailwind imports
├── App.tsx           # HashRouter with route definitions
└── main.tsx          # React entry point
```

## Key Files

- `protocol/abi.ts` — All contract ABIs. Add new function signatures here.
- `protocol/networks.ts` — Chain configs with deployed contract addresses.
- `protocol/pools.ts` — Pool discovery via factory multicalls.
- `config/env.ts` — Vite environment variable resolution.
- `config/wallet.ts` — RainbowKit + wagmi chain/transport setup.
- `App.tsx` — Route definitions (HashRouter).

## Contract Addresses (Arbitrum Sepolia — staging release s1.0.2)

```
Factory (Proxy):      0x755C9bd97B882278E3d19D2A1e31ad522C3f6483
Governor:             0x6E6d60fAc4FE03279652fe28ea7d837E51e091Ca
YSToken:              0x59901b01FAa6d4928FBB24838D009B47d47631a8
Timelock:             0xEC57FcFBAe031B4d983a24A5688949FAE5Ee848C
Pool Implementation:  0xa9a98eaEFc534c8f53C7FbEc6B38fE77E83AbbA3
Pyth Oracle:          0x6cEB6aFDe5F6C01B00D622B35Fc201a57c30c671
Composite Oracle:     0x0ACfDdEFF4c047F657AB026812dcdf5497c528e8
ERC4626 Oracle Feed:  0x2D31DbF4b63DADA0053951a2B667f92336d22e91
Mock Token Faucet:    0x463C71d06a8646C1EA455bfaa1a6F365820050e4
```

## Protocol Interaction Patterns

### Reading contract state

Use viem's `publicClient.readContract()` or `publicClient.multicall()` for
batched reads. All read clients are cached in `protocol/networks.ts` via
`getProtocolReadClient(chainId)`.

```typescript
const client = getProtocolReadClient(chainId);
const price = await client.readContract({
  address: deployment.compositeOracle,
  abi: ORACLE_ABI,
  functionName: "getPrice",
  args: [tokenAddress],
});
```

### Writing to contracts

Use wagmi's `useWriteContract` hook. All write operations follow this pattern:

1. Validate inputs against contract limits (read `poolConfig()` first).
2. Ensure oracle prices are fresh (Pyth two-tx flow if needed).
3. Check and request ERC20 approval if needed.
4. Submit the transaction.
5. Invalidate React Query cache on success.

### Oracle price freshness (before transactions)

```typescript
// 1. Check staleness
const [isStale] = await client.readContract({
  address: pythOracle,
  abi: PYTH_ABI,
  functionName: "isPriceStale",
  args: [token],
});

// 2. If stale, fetch from Hermes and submit update tx
if (isStale) {
  const updateData = await hermesClient.getLatestPriceUpdates([feedId]);
  const fee = await client.readContract({
    address: pythOracle,
    abi: PYTH_ABI,
    functionName: "getUpdateFee",
    args: [updateData],
  });
  await writeContract({
    address: pythOracle,
    functionName: "updatePriceFeeds",
    args: [updateData],
    value: fee,
  });
}

// 3. Now submit the actual pool transaction
```

### ERC20 approval pattern

```typescript
// 1. Check current allowance
const allowance = await client.readContract({
  address: token,
  abi: ERC20_ABI,
  functionName: "allowance",
  args: [user, spender],
});

// 2. If insufficient, approve
if (allowance < amount) {
  await writeContract({
    address: token,
    functionName: "approve",
    args: [spender, amount],
  });
}

// 3. Execute the deposit/createPool
```

### Position discovery

Ponder-first with on-chain fallback:

```typescript
// Try Ponder
const positions = await queryPonder(userPositionsQuery, { address });
if (positions) return positions;

// Fallback: scan NFT ownership on-chain
for (const pool of pools) {
  const [shieldCount, protectorCount] = await getUserNFTCounts(pool, user);
  if (shieldCount > 0 || protectorCount > 0) {
    // Scan ownerOf(tokenId) for 0..nextTokenId
  }
}
```

## Code Conventions

- Functional React components only.
- Descriptive variable names with auxiliary verbs (`isLoading`, `hasError`).
- Early returns for error/edge cases.
- All contract ABIs in `protocol/abi.ts`, typed `as const`.
- Format utilities in `protocol/format.ts`.
- No `'use client'` directives (not a Next.js app).
- DaisyUI component classes for UI elements (`btn`, `card`, `badge`, etc.).
- DaisyUI theme tokens for colors (`bg-base-100`, `text-base-content`, etc.).
- `data-theme` attribute on `<html>` for light/dark switching.

## Commits

Make regular, small commits. Each commit should leave the repo in a buildable,
coherent state.

**Before every commit, verify:**

1. `npm run typecheck` passes with no errors.
2. `npm run build` completes successfully.
3. No regressions in existing functionality.

Do not commit code that breaks the build or fails type checking. Fix all errors
first.

**Commit message format:**

- Use conventional-style prefixes: `feat:`, `fix:`, `refactor:`, `docs:`,
  `chore:`.
- Write a clear, descriptive summary of what was done (not just "update files").
- If the commit is part of a multi-step implementation, reference the step
  (e.g., "feat: add oracle price module (step 2/11)").

**Examples:**

```
feat: add pool write ABIs (depositShieldedAsset, shieldedWithdraw, etc.)
feat: add oracle price module with Pyth Hermes freshness flow
feat: add ERC20 approval helper hook
feat: add shielded deposit drawer with validation and approval
fix: handle stale Pyth prices gracefully in deposit flow
refactor: extract position discovery into protocol/positions.ts
docs: update spec with finalized ABI surface
```

**When to commit:**

- After completing a logical unit of work (a new module, a new feature, a bug
  fix).
- After each step in the implementation order (see `docs/spec-v1.md`).
- Before moving on to a different area of the codebase.

## Environment Variables

```bash
VITE_WALLETCONNECT_PROJECT_ID   # Optional. Enables mobile wallets via QR.
VITE_DEFAULT_CHAIN               # "arbitrumSepolia" (default) or "foundry"
VITE_RPC_URL_421614              # Custom Arbitrum Sepolia RPC (fallback: drpc.org)
VITE_RPC_URL_31337               # Custom Foundry RPC (fallback: localhost:8545)
VITE_PONDER_GRAPHQL_URL          # Optional. Ponder GraphQL for points/positions.
VITE_ENABLE_TESTNETS             # true (default). Includes Foundry in wallet.
```

No variable in this app is a secret. All are safe for static IPFS builds.

## Target Networks

- **Arbitrum Sepolia** (421614) — primary testnet
- **Local Foundry** (31337) — local development

## V1 Scope

**In scope:** Pool discovery, pool creation, shielded/protector deposits,
full/partial withdrawals, shield activation, protector unlock/withdraw, claim
fees/commissions, points/quests/leaderboard, oracle USD pricing, Pyth freshness.

**Out of scope:** Governance writes, email alerts, off-chain metadata editing,
APY display, multi-chain beyond Sepolia + Foundry.

See `docs/spec-v1.md` for the full specification.
