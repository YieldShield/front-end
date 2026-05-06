# Maintainers

This repository is maintained by the YieldShield organization.

## Responsibilities

Maintainers are responsible for:

- keeping the default branch releasable
- reviewing pull requests for IPFS-static compatibility and security impact
- keeping public docs aligned with supported deployments
- triaging issues and security contact requests
- coordinating releases, advisories, and dependency updates

## Review Expectations

Pull requests should receive at least one maintainer review before merge. Changes
that affect wallet flows, transaction construction, contract addresses, ABIs,
oracle assumptions, points snapshot verification, or IPFS deployment behavior
need closer review than copy-only or documentation changes.

## Decision Process

Maintainers prefer small, reversible changes with clear validation. When a
decision affects protocol safety, user funds, release process, or public
security posture, maintainers should document the reasoning in the pull request
or a linked issue.

## Releases

Release notes should call out user-facing changes, deployment configuration
changes, supported chains, security fixes, and any manual migration steps.
