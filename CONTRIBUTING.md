# Contributing

Thanks for helping improve YieldShield front-end. This repository is an
IPFS-first browser application, so contributions should preserve static hosting,
browser-only execution, and clear security boundaries.

## Setup

Requirements:

- Node.js version from `.nvmrc`
- npm version from `packageManager` in `package.json`

Install dependencies:

```bash
npm ci
```

Run the app:

```bash
npm run dev
```

## Workflow

1. Keep the app IPFS-safe by default.
2. Prefer small commits that each leave the repo in a coherent state.
3. Do not add server-only features to the frontend without documenting why they
   still fit the IPFS-first architecture.

Use short-lived branches and focused pull requests. Include screenshots for UI
changes and link related issues when available.

## Architecture Guardrails

- No internal API routes inside the frontend app.
- No secret-bearing runtime behavior in browser code.
- No framework features that require a request-time server.
- Prefer direct contract reads or external hosted APIs over local backend glue.
- Treat public RPCs, IPFS gateways, and points snapshots as untrusted inputs.
- Review contract addresses, ABIs, chain IDs, and oracle assumptions carefully.

## Validation

Before opening a pull request, run the checks that match your change:

```bash
npm run typecheck
npm test
npm run build --workspace @yieldshield/front-end-web
npm run format:check
```

Documentation-only changes do not need the full build, but they should still be
checked for broken links and stale commands.

## Security

Do not report vulnerabilities in public issues or pull requests. Follow
`SECURITY.md`, especially for anything involving wallet signing, transaction
construction, contract addresses, or funds-at-risk scenarios.

Never include private keys, seed phrases, private RPC URLs, or secret API keys
in code, tests, docs, screenshots, logs, or issue comments.

## Commit Strategy

The repository is intentionally being developed in narrow slices:

- docs and repo setup
- app scaffold
- protocol client
- read-only screens
- transaction flows

That keeps review and rollback straightforward.
