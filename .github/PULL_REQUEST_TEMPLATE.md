## Summary

-

## Validation

- [ ] `npm run typecheck --workspace @yieldshield-lite/web`
- [ ] `npm run typecheck --workspace @yieldshield-lite/points-sqd`
- [ ] `npm run test --workspace @yieldshield-lite/web`
- [ ] `npm run test --workspace @yieldshield-lite/points-sqd`
- [ ] `npm run build --workspace @yieldshield-lite/web`

## Checklist

- [ ] The change keeps the frontend IPFS/static-hosting compatible.
- [ ] No secrets or private API keys are introduced into browser-exposed config.
- [ ] Contract addresses, ABIs, chains, RPCs, and oracle assumptions were checked when touched.
- [ ] Docs or `.env.example` were updated when behavior or configuration changed.
- [ ] UI changes include screenshots or a short description of manual browser testing.
- [ ] Security-sensitive details are handled through `SECURITY.md`, not public comments.
