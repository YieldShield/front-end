# anymatch compatibility package

This private, local compatibility package replaces `anymatch` 3.1.3. Its
`picomatch` 2 dependency is affected by
[GHSA-fc5q-39xc-vjpf](https://github.com/advisories/GHSA-fc5q-39xc-vjpf), a
ReDoS through single-branch repeated extglobs, and no patched `picomatch`
release exists yet. The matching logic is unchanged. String globs are compiled
with `minimatch` 11.0.1 or later, past its own ReDoS fix, and the
`normalize-path` helper is inlined.

The source and types derive from
[micromatch/anymatch 3.1.3](https://github.com/micromatch/anymatch/tree/3.1.3),
under the bundled ISC license. The local version 3.1.4 identifies this
repository's private compatibility package, not a published upstream release.
The root manifest's file dependency and override keep unstorage on this
reviewed implementation. Unstorage, reached through WalletConnect, only uses
anymatch in its Node `fs` driver.

`npm test` runs `node vendor/anymatch/test.js`, which checks compatibility and
the extglob timing regression. The same package is vendored in
YieldShield/yieldshield-monad. Remove it once a patched `picomatch` is published
and `anymatch` or `unstorage` adopts it.
