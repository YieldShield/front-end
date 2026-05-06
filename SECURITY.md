# Security Policy

YieldShield front-end code is public, but vulnerability details should not be
reported in public issues, pull requests, discussions, or social channels before
the maintainers have had time to triage.

## Supported Scope

Security reports for this repository may cover:

- browser-only wallet, transaction, or signing flows
- incorrect contract addresses, chain configuration, or ABI usage
- unsafe handling of public RPC, oracle, points snapshot, or IPFS gateway data
- dependencies, build tooling, or static deployment behavior that could affect
  users of the front end
- documentation that could cause users or operators to deploy an unsafe build

Smart contract vulnerabilities in the wider YieldShield protocol are also
security-sensitive. If a report crosses from the front end into contracts or
governance, report it privately and mention the affected contract, chain, and
address when known.

For the repository's current frontend-specific trust boundaries, see
[`docs/security/frontend-threat-model.md`](docs/security/frontend-threat-model.md).

## Reporting a Vulnerability

Use GitHub's private vulnerability reporting for this repository when it is
available. Include:

- a concise summary of the issue
- affected route, package, contract, chain, or deployment address
- steps to reproduce or a proof of concept
- expected impact and any known funds-at-risk scenario
- the commit, build, or deployed URL you tested
- your preferred contact for follow-up

If private vulnerability reporting is not available, open a public issue titled
`Security contact request` without technical details. A maintainer will arrange
a private reporting path.

## Response Expectations

The project aims to acknowledge new security reports within three business days
and provide an initial triage result within seven business days. Complex reports,
reports requiring protocol coordination, or reports involving third-party
infrastructure may take longer.

The maintainers may publish an advisory, patch, release note, or migration note
after a fix is available. Please keep details private until maintainers confirm
that disclosure is safe.

## Bounties

This repository does not currently define a public bug bounty program. Security
reports are still welcome and appreciated, but do not assume bounty eligibility
unless a separate official program says so.
