# Protocol event ABIs

These event subsets are generated from the smart-contracts revision recorded in
`smart-contracts-source.json` at the repository root. Regenerate them and the
browser ABI subsets with:

```sh
YS_EVM_OUT_DIR=/path/to/smart-contracts/out npm run sync:contracts
```

Compile that source revision first. ABI updates do not change deployed contract
addresses or on-chain bytecode.
