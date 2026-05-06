# Release Process

This repository is currently pre-production. Releases should stay small,
reviewable, and easy to roll back.

## Before Release

1. Confirm the target commit is on `main`.
2. Review `CHANGELOG.md` and move relevant `Unreleased` entries into a dated
   release section.
3. Confirm `.env.example` documents every public build variable needed for the
   release.
4. Confirm contract addresses, chain IDs, ABIs, RPC defaults, oracle settings,
   and points snapshot settings match the intended environment.
5. Run the release checks:

```bash
npm ci
npm run typecheck
npm test
npm run build
npm run format:check
npm audit --omit=dev --audit-level=high
```

6. Manually smoke-test the built app with the target wallet, route set, and
   network configuration.

## IPFS Or Static Hosting

For IPFS-oriented releases, follow `docs/ipfs-deployment.md` and record:

- frontend build commit
- build command and environment
- frontend CID or static deployment URL
- points snapshot CID, DNSLink name, or manifest URL when applicable
- deployment chain and contract addresses

## After Release

1. Create a GitHub release or tag when the deployment should be discoverable.
2. Add user-facing notes for behavior changes, security fixes, deployment
   changes, and any manual migration steps.
3. Keep vulnerability details private until maintainers confirm disclosure is
   safe.
