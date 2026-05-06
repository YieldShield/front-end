# Frontend Threat Model

This document describes the main security boundaries for the YieldShield front
end. It is not a protocol audit and does not replace smart contract review.

## Scope

The front end is a static browser application. It can prepare transactions,
display protocol state, read public endpoints, and verify some off-chain data.
It cannot keep secrets, enforce protocol invariants, or replace on-chain
authorization.

In scope for this threat model:

- wallet connection and signing flows
- transaction construction and simulation
- contract addresses, ABIs, chain IDs, and RPC selection
- oracle freshness UX and Pyth update data retrieval
- points snapshot fetching and verification
- IPFS gateway, DNSLink, and static hosting assumptions
- public environment variables baked into the build

Out of scope:

- smart contract correctness
- private key or seed phrase recovery
- wallet implementation bugs
- third-party RPC, gateway, wallet, or indexer availability guarantees

## Trust Boundaries

### Wallets

Wallets are the final signing authority. The app should make transaction intent
clear before asking for a signature, but users must still review wallet prompts.

The app must not:

- request seed phrases or private keys
- hide contract addresses involved in sensitive flows
- ask users to sign opaque messages for transaction-critical behavior without a
  clear explanation

### RPC Endpoints

RPC endpoints are untrusted infrastructure. They can be unavailable, rate
limited, stale, or inconsistent with other endpoints.

Transaction-critical state should come from deployed contracts. When possible,
the app should use multiple browser-safe public fallbacks and show recoverable
errors instead of assuming a single RPC is always correct.

### IPFS Gateways And Static Hosts

Gateways serve content but do not define truth. A fixed IPFS CID gives content
addressing; DNSLink, IPNS, hosted URLs, and mutable manifest URLs add operator
convenience but require trust in the pointer.

For release review, record the frontend build commit, build environment,
published CID or URL, and any mutable pointer used to find the build.

### Public Environment Variables

All `VITE_*` values are public once the app is built. They must not contain
private RPC URLs, API keys, signer keys, admin secrets, webhook secrets, or
other credentials.

### Points Snapshots

Points data is advisory off-chain scoring unless a separate official program
says otherwise. Points snapshots do not represent tokens, claims, rewards, or
entitlement by themselves.

Snapshot manifests include hashes and optional runner signatures so the browser
can detect file tampering. Those checks do not prove economic entitlement or
replace protocol governance.

## Review Checklist

Use extra review for pull requests that touch:

- `apps/web/src/protocol/abi.ts`
- `apps/web/src/protocol/networks.ts`
- wallet or transaction hooks
- oracle freshness and Pyth update code
- points snapshot validation
- `.env.example` or any public build-time configuration
- IPFS deployment docs and release checklists

For those changes, reviewers should confirm:

- the configured chain and contract addresses are intentional
- ABIs match the deployed contracts
- no secrets are introduced into browser-exposed config
- transaction prompts and failure states are understandable
- mutable snapshot or deployment pointers are documented
- tests, typechecks, and build checks still pass

## Reporting

Report vulnerabilities privately through `SECURITY.md`. Do not disclose
funds-at-risk details in public issues, pull requests, or discussions before
maintainers complete triage.
