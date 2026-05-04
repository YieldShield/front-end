# Contributing

## Workflow

1. Keep the app IPFS-safe by default.
2. Prefer small commits that each leave the repo in a coherent state.
3. Do not add server-only features to the frontend without documenting why they
   still fit the IPFS-first architecture.

## Architecture Guardrails

- No internal API routes inside the frontend app.
- No secret-bearing runtime behavior in browser code.
- No framework features that require a request-time server.
- Prefer direct contract reads or external hosted APIs over local backend glue.

## Commit Strategy

The repository is intentionally being developed in narrow slices:

- docs and repo setup
- app scaffold
- protocol client
- read-only screens
- transaction flows

That keeps review and rollback straightforward.
