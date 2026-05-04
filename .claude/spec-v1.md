# YieldShield Lite V1 Specification

## Goal

Ship a fully functional, IPFS-deployable frontend for the YieldShield protocol
that lets users discover pools, deposit, withdraw, claim rewards, create pools,
and participate in the points system — all without a backend service or private
keys in the browser.

The app reads on-chain state directly via RPC, uses a public Ponder GraphQL
endpoint for optional enrichment (points, position acceleration), and handles
oracle price freshness via Pyth Hermes in the browser.

## V1 Scope

### In scope

- Wallet connection (RainbowKit, Arbitrum Sepolia + local Foundry)
- Pool discovery and browsing (on-chain via factory)
- Pool detail views with USD-denominated balances (oracle reads)
- Pool creation (token selection from whitelist, fee config, creation bond)
- Shielded deposits (ERC20 approval + deposit flow)
- Protector deposits (ERC20 approval + deposit flow)
- Position discovery (Ponder primary, on-chain NFT scanning fallback)
- Full and partial shielded withdrawals
- Shield activation (withdraw in backing token)
- Protector unlock/cancel/withdraw flow
- Claim yield fees (shield positions)
- Claim commissions (protector positions)
- Points, quests, streaks, and leaderboard (via Ponder GraphQL)
- Oracle price reads for USD conversion and deposit validation
- Pyth price freshness updates (browser-to-Hermes, sequential two-tx flow)
- Fee display: total fee with expandable breakdown
- Static landing page, docs page
- IPFS-safe static build (HashRouter, relative asset paths)

### Out of scope for V1

- Governance writes (propose, vote, delegate, queue, execute)
- Email alerts and waitlist flows
- Off-chain pool metadata editing (names, descriptions, creator profiles)
- Cron jobs and backend mutation endpoints
- Server-side price proxying
- APY/yield display (requires historical data infrastructure)
- Multi-chain beyond Arbitrum Sepolia + Foundry
- Pool health beyond the current simplified model

---

## Architecture

### Stack

| Layer | Technology |
|---|---|
| Build | Vite 8, static output to `dist/` |
| UI | React 19, Tailwind CSS 4, DaisyUI 5 |
| Routing | react-router-dom (HashRouter) |
| Wallet | RainbowKit 2, wagmi 2, viem 2 |
| Data fetching | TanStack React Query |
| Indexed data | Ponder GraphQL (external, optional) |
| Oracle prices | Direct contract reads + Pyth Hermes API |
| Deployment | Static files on IPFS or any CDN |

### IPFS guardrails

These constraints apply to all code in the app:

1. **No API routes.** All data comes from RPC calls, public APIs, or optional
   Ponder GraphQL.
2. **No secrets in the browser.** No private keys, no API keys that grant
   privileged access. All external APIs used (Pyth Hermes, Ponder GraphQL) are
   public and require no authentication.
3. **No server-side rendering.** No `getServerSideProps`, no request-time logic.
4. **No host-specific rewrite rules.** HashRouter handles deep links.
5. **Relative asset paths.** Vite `base: "./"` ensures IPFS gateway
   compatibility.
6. **Optional enrichment only.** The app must degrade gracefully when Ponder is
   unavailable. Core transaction flows must work with RPC alone.

### Data sources

| Source | What it provides | Required? |
|---|---|---|
| EVM RPC (Alchemy / public) | Contract state: pools, balances, positions, oracle prices, token metadata | Yes |
| Pyth Hermes API | Price update data for Pyth pull oracle freshness | Yes (for transactions) |
| Ponder GraphQL | Points, quests, streaks, leaderboard, position discovery acceleration | No (graceful degradation) |

---

## Ponder Integration

### Strategy

Reuse the existing Ponder service from the full monorepo
(`yieldshield/packages/ponder`). It is already deployed and indexes all pool
events needed for the points system.

### Required change

The Ponder CORS config must allow requests from IPFS gateways. Recommended
approach: set CORS to wildcard (`*`) with rate limiting, since all indexed data
is derived from public blockchain events and contains no secrets.

### What the lite app queries

The lite app makes exactly 4 types of GraphQL queries:

1. **Top users** — leaderboard (userPointss, ordered by totalPoints desc)
2. **User points** — single user's total (userPoints by address)
3. **Quest completions** — user's completed quests (questCompletions filtered by
   address)
4. **User streak** — current/longest streak (userStreak by address)

Future addition for V1: position discovery queries (user deposits/positions by
address), with on-chain NFT scanning as fallback.

### No authentication

Ponder's GraphQL API requires no Bearer token or API key. The token the full
app's Next.js routes send is validated by Next.js internal middleware, not by
Ponder itself. The lite app connects directly to Ponder without any auth header.

### Configuration

```
VITE_PONDER_GRAPHQL_URL=https://ponder.yieldshield.ai/graphql
```

When unset, all Ponder-dependent features (points, leaderboard, accelerated
position discovery) are hidden. Core pool and transaction flows still work via
RPC.

---

## Oracle Integration

### Architecture

The protocol uses a CompositeOracle that routes token pricing to specialized
feeds (Pyth, Chainlink, ERC4626). The lite app reads prices via two view
functions:

```
compositeOracle.getPrice(token)  → uint256 (8-decimal USD price)
compositeOracle.getValue(token, amount) → uint256 (8-decimal USD value)
```

These are stateless contract reads — no special infrastructure required.

### Pyth price freshness

Pyth is a pull oracle. If the on-chain price is older than `maxPriceAge`
(default 60 seconds), pool transactions that rely on oracle reads will revert
with `StalePrice`.

**Browser-only freshness flow (sequential two-transaction pattern):**

1. Frontend checks `isPriceStale(token)` on the oracle contract.
2. If stale:
   a. Read the price feed ID from `tokenToPriceFeedId(token)` on PythOracle.
   b. Fetch binary update data from Pyth Hermes API
      (`hermes.pyth.network` — public, no API key, browser-safe CORS).
   c. Read the update fee via `getUpdateFee(updateData)`.
   d. Submit `updatePriceFeeds(updateData)` transaction — user signs and pays
      fee in ETH (~0.001 ETH).
   e. Wait for confirmation.
3. Submit the main pool transaction (deposit/withdraw/etc.) — user signs.

If the price update fails, proceed anyway and let the pool transaction revert
naturally if prices are truly too stale. This matches the full app's behavior.

**When to check freshness:**
- Before deposits (shielded and protector)
- Before withdrawals
- Not needed for read-only browsing (stale display prices are acceptable)

### Dependencies

```
@pythnetwork/hermes-client  — for fetching binary price update data from Hermes
```

This package works in the browser (just HTTP calls, no Node.js dependencies).

---

## Transaction Flows

All transaction flows use a drawer-based modal UI pattern with multi-step
progress indicators.

### 1. Shielded Deposit

**User goal:** Deposit a yield-bearing token into a pool for protection.

**Steps:**
1. User selects pool and enters amount.
2. Frontend validates: amount within pool's min/max, user has sufficient
   balance, pool not at TVL cap.
3. Ensure oracle prices are fresh (Pyth flow above).
4. Check ERC20 allowance. If insufficient, prompt approval transaction.
5. Submit `depositShieldedAsset(asset, amount, minReceivedAmount)`.
6. On success, display new position (Shield Receipt NFT minted).

**Contract calls:** `ERC20.allowance`, `ERC20.approve`, `pool.depositShieldedAsset`
**Validation reads:** `pool.poolConfig`, `oracle.getValue`, `ERC20.balanceOf`

### 2. Protector Deposit

**User goal:** Provide backing collateral to a pool and earn commissions.

**Steps:** Same as shielded deposit, but calls
`depositBackingAsset(asset, amount, minReceivedAmount)`.

### 3. Shielded Withdrawal (Full)

**User goal:** Withdraw full position from a pool.

**Steps:**
1. User selects position (by NFT tokenId).
2. Frontend reads `getShieldDepositInfo(tokenId)` for position data.
3. User chooses asset: shielded token (normal) or backing token (shield
   activation, requires minimumPoolTime elapsed).
4. Ensure oracle prices are fresh.
5. Submit `shieldedWithdraw(tokenId, preferredAsset, minAmountOut)` with
   slippage protection.
6. On success, position marked as withdrawn.

### 4. Shielded Withdrawal (Partial)

Same as full withdrawal, but calls
`partialWithdrawShielded(tokenId, withdrawAmount, preferredAsset, minAmountOut)`.
Remaining amount stays in pool (new NFT minted).

### 5. Protector Unlock and Withdraw

**User goal:** Withdraw protector position (requires unlock period).

**Steps:**
1. Start unlock: `startUnlockProcess(tokenId)` — begins countdown.
2. Wait for unlock duration (displayed in UI with countdown timer).
3. After unlock: `protectorWithdraw(tokenId, amount, preferredAsset, minAmountOut)`.
4. User can cancel anytime with `cancelUnlockProcess(tokenId)`.

### 6. Claim Yield Fees (Shield Positions)

Call `claimRewards(tokenId)`. Rate-limited to once per 24 hours per position.
Show claimable amount from position data.

### 7. Claim Commissions (Protector Positions)

Call `claimCommission(tokenId)`. Claimable amount available from
`getProtectorDepositInfo(tokenId)`.

### 8. Pool Creation

**User goal:** Create a new protection pool.

**Form fields:**
- Shielded token (dropdown from `getWhitelistedTokens()`)
- Backing token (dropdown from whitelist)
- Commission rate (basis points, within contract bounds)
- Pool fee (basis points, within contract bounds)
- Collateral ratio (basis points, within contract bounds)
- Creation bond amount (must meet minimum USD value)

**Steps:**
1. User fills form with token selection and fee configuration.
2. Frontend validates all parameters against contract limits.
3. Check ERC20 allowance for creation bond. Approve if needed.
4. Submit `factory.createPool(shieldedToken, shieldedTokenSymbol, backingToken,
   backingTokenSymbol, commissionRate, poolFee, collateralRatio,
   creationBondAmount)`.
5. On success, redirect to new pool's detail page.

---

## Position Discovery

### Strategy: Ponder primary, on-chain fallback

**When Ponder is available:**
Query user positions via GraphQL (fast, indexed, returns all positions across
all pools in a single query).

**When Ponder is unavailable (on-chain fallback):**
1. Fetch all pool addresses from factory.
2. For each pool, call `getUserNFTCounts(userAddress)` to check if user has
   positions (skip pools with zero count).
3. For pools with positions:
   a. Read `shieldReceiptNFT()` and `protectorReceiptNFT()` addresses.
   b. Read `nextTokenId()` on each NFT contract.
   c. Batch `ownerOf(tokenId)` calls (multicall) to find user's tokenIds.
   d. Read position data via `getShieldDepositInfo` / `getProtectorDepositInfo`.
4. Limit scan to first 100 tokenIds per NFT contract to avoid RPC overload.

### Caching

Position data is cached via React Query with `refetchOnWindowFocus: false`.
After a successful transaction (deposit/withdraw/claim), invalidate the
relevant query keys to trigger a refetch.

---

## ABI Surface

### Read-only (already implemented)

```
FACTORY_ABI: pools, getActivePools, getActivePoolsInfo, getWhitelistedTokens, getPoolInfo
POOL_ABI: getPoolBalances
ERC20_METADATA_ABI: decimals, symbol
GOVERNANCE_TOKEN_ABI: balanceOf, delegates, getVotes
GOVERNOR_ABI: state, proposalVotes, proposalThreshold, votingDelay, votingPeriod, quorum
TIMELOCK_ABI: getMinDelay
GOVERNOR_PROPOSAL_CREATED_EVENT
```

### New for V1 — Pool reads

```
poolConfig() → PoolConfig struct (min/max deposits, minimumPoolTime,
    unlockDuration, protocolFee, protocolFeeRecipient, priceOracle)
getShieldDepositInfo(tokenId) → (amount, depositTime, valueAtDeposit,
    lastFeeClaimTime, isWithdrawn)
getProtectorDepositInfo(tokenId) → (amount, depositTime, unlockRequestTime,
    lockedAmount, availableAmount, claimableCommission)
getUserNFTCounts(user) → (shieldNFTCount, protectorNFTCount)
shieldReceiptNFT() → address
protectorReceiptNFT() → address
```

### New for V1 — Pool writes

```
depositShieldedAsset(asset, depositAmount, minReceivedAmount) → tokenId
depositBackingAsset(asset, depositAmount, minReceivedAmount) → tokenId
shieldedWithdraw(tokenId, preferredAsset, minAmountOut)
partialWithdrawShielded(tokenId, withdrawAmount, preferredAsset, minAmountOut) → newTokenId
claimRewards(tokenId)
startUnlockProcess(tokenId)
cancelUnlockProcess(tokenId)
protectorWithdraw(tokenId, amount, preferredAsset, minAmountOut)
claimCommission(tokenId)
```

### New for V1 — Factory writes

```
createPool(shieldedToken, shieldedTokenSymbol, backingToken, backingTokenSymbol,
    commissionRate, poolFee, collateralRatio, creationBondAmount) → poolAddress
```

### New for V1 — ERC20

```
approve(spender, amount) → bool
allowance(owner, spender) → uint256
balanceOf(account) → uint256
```

### New for V1 — Oracle reads

```
getPrice(token) → uint256 (8-decimal USD)
getValue(token, amount) → uint256 (8-decimal USD)
isPriceStale(token) → (bool isStale, uint64 publishTime)
```

### New for V1 — Pyth oracle

```
updatePriceFeeds(bytes[] priceUpdateData) [payable]
getUpdateFee(bytes[] priceUpdateData) → uint256
tokenToPriceFeedId(token) → bytes32
```

### New for V1 — NFT reads (on-chain position scanning fallback)

```
ownerOf(tokenId) → address
nextTokenId() → uint256
```

---

## Fee Display

Pool fees are shown as a single **total fee** number (commission + pool fee +
protocol fee combined into basis points). An expandable "Details" section breaks
it down:

| Fee type | Source | Who receives |
|---|---|---|
| Commission | `commissionRate` from pool info | Protectors (pro-rata) |
| Pool fee | `poolFee` from pool info | Pool creator |
| Protocol fee | `protocolFee` from `poolConfig()` | Protocol treasury |

---

## Environment Variables

```bash
# WalletConnect Project ID (optional — public app identifier, not a secret).
# When set, enables mobile wallet connections via QR code.
# When unset, only browser extension wallets (MetaMask, Rabby, etc.) work.
VITE_WALLETCONNECT_PROJECT_ID=...

# Chain selection (default: arbitrumSepolia)
VITE_DEFAULT_CHAIN=arbitrumSepolia

# RPC overrides (optional, fallbacks exist)
VITE_RPC_URL_421614=...       # Arbitrum Sepolia (fallback: drpc.org)
VITE_RPC_URL_31337=...        # Local Foundry (fallback: localhost:8545)

# Ponder integration (optional, enables points + position acceleration)
VITE_PONDER_GRAPHQL_URL=...

# Testnets (default: true, includes Foundry chain in wallet)
VITE_ENABLE_TESTNETS=true
```

No environment variable in this app is a secret. All values are safe to embed
in a static build deployed to IPFS.

---

## Deployment

### Build

```bash
npm run build   # TypeScript check + Vite → dist/
```

### IPFS deployment

```bash
ipfs add -r dist/   # Produces CID for the entire app
```

The output works on any IPFS gateway without modification. HashRouter ensures
deep links work. Relative asset paths ensure resources load correctly.

### Ponder

The existing Ponder from `yieldshield/packages/ponder` is deployed separately
as a Node.js service with PostgreSQL. It requires:

- A server (Railway, Fly.io, Render, etc.)
- PostgreSQL database
- An RPC endpoint (Alchemy API key — server-side only, never exposed)
- CORS config updated to allow wildcard origins

No private keys are involved. No secrets are exposed to the frontend. The lite
app only needs the public GraphQL URL.

---

## Testing Strategy

### Manual testing (V1)

- Local Foundry chain: deploy contracts, create pools, test all transaction
  flows end-to-end.
- Arbitrum Sepolia: test against live testnet deployment with real Pyth oracles.
- IPFS preview: build, add to local IPFS, access via gateway to verify routing,
  assets, and deep links.

### Type safety

```bash
npm run typecheck   # Catches type errors before build
```

---

## Implementation Order

1. **ABI expansion** — Add all new ABIs (pool reads/writes, factory writes,
   ERC20 approve/allowance, oracle reads, Pyth updates, NFT reads).

2. **Oracle price module** — `protocol/oracle.ts` with getPrice, getValue,
   isPriceStale, and ensureFreshPrices (Hermes integration).

3. **ERC20 approval helper** — Reusable hook/utility for the
   check-allowance → approve → execute pattern.

4. **Position discovery module** — `protocol/positions.ts` with Ponder-first,
   on-chain-fallback logic.

5. **Deposit flows** — Shielded and protector deposit drawers with validation,
   approval, oracle freshness, and transaction execution.

6. **Withdrawal flows** — Full, partial, and shield activation drawers.

7. **Claim flows** — Yield fee claims and protector commission claims.

8. **Protector unlock flow** — Start/cancel unlock with countdown timer.

9. **Pool creation** — Form with whitelist token selection, fee config,
   creation bond approval, and factory call.

10. **Position views** — User portfolio showing all positions across pools,
    with claimable amounts and unlock status.

11. **IPFS hardening** — Build verification, asset path audit, deep-link
    testing, deployment documentation.
