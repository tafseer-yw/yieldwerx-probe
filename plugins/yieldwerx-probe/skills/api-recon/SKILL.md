---
name: api-recon
user-invocable: true
description: Use when Swagger/OpenAPI, HAR, browser traffic, or a reachable application is available and API endpoints, payloads, authentication, dependencies, and contract drift must be discovered before API or UI automation. Produces a sanitized, reconciled API inventory and never treats captured secrets or one observed example as the full specification.
track: scripting
safety: reads-external-writes-local
produces: .probe/artifacts/<feature>/40-api-recon/api-inventory.md, contract-drift.md, sanitized-samples/, api-recon.md
consumes: Swagger/OpenAPI documents, optional 40-ui-recon/network-observations.md, approved cases, environment configuration
argument-hint: <feature-slug> [env] [--spec <path-or-url>] [--capture-ui]
---

> **Consumer contract:** Before using paths, commands, integrations, or
> framework-specific rules, read
> `${CLAUDE_PLUGIN_ROOT}/references/configuration.md`. Resolve consumer
> locations and commands from `probe.config.yaml`; use documented defaults
> only when the file is absent.

# API Recon

## Why

Replace guessed endpoints and payloads with a traceable contract reconciled
from declared documentation and observed traffic.

## What

Inventory HTTP operations, authentication, parameters, payload shapes,
responses, side effects, dependencies, and drift with provenance and confidence.

## When

Run before API test creation, or before UI scripting when network behavior is
part of the test oracle, setup, synchronization, or mocking strategy.

## Where

Read the supplied spec and authorized non-production traffic; write sanitized
evidence under the configured `40-api-recon` artifact directory.

## How

Normalize OpenAPI operations, capture only in-scope traffic, redact secrets,
group observations by operation, reconcile declared and observed contracts,
and publish gaps without silently choosing one source.

## Tandem mode

Use `--capture-ui` when no current `40-ui-recon/network-observations.md` covers
the approved paths. Coordinate one UI Recon walk, register sanitized network
observation before its first action, and reuse that browser context instead of
opening or independently driving a second page. UI Recon owns UI evidence; API
Recon owns the reconciled HTTP contract. If UI Recon was invoked with
`--with-api-recon`, consume its handoff directly and do not recursively launch
another UI Recon cycle.

## Preconditions

- Obtain explicit feature, environment, role, and permitted UI-path scope.
- Use safe test environments and dedicated accounts. Do not probe arbitrary
  endpoints, bypass authorization, or perform destructive calls for discovery.
- Require Swagger/OpenAPI, a sanitized HAR/network handoff, or a reachable app
  with browser tooling. Otherwise mark recon `blocked` and state what is missing.

## Procedure

1. Read [references/api-contract.md](references/api-contract.md) and mark API
   Recon `in-progress` in the feature ledger.
2. Snapshot the supplied OpenAPI document. Record source, OpenAPI version,
   retrieval time, document version, server variables, and revision/checksum.
   Resolve `$ref` values and report unresolved or circular references.
   For the `playwright-bdd` profile, use the consumer's deterministic importer
   when available:
   `npm run api:import -- --spec <swagger.json|yaml> --out <40-api-recon>/api-inventory.generated.md`.
   Review and enrich the generated `spec-only` inventory; generation does not
   replace live reconciliation or approval.
3. Import `40-ui-recon/network-observations.md` when present. With
   `--capture-ui`, coordinate `/ui-recon <feature> <env> --with-api-recon` once,
   pass the supplied `--spec`, and observe request/response metadata during its
   approved walk in the same browser context. Do not save credentials, cookies,
   tokens, API keys, signed URLs, session identifiers, personal/customer data,
   or unreviewed binary bodies.
4. Exclude static assets, telemetry, third-party analytics, and health noise
   unless explicitly in scope. Normalize variable identifiers into path
   templates without collapsing genuinely different operations.
5. Reconcile by method plus normalized path. Keep declared and observed facts
   separate, then assign `confirmed | spec-only | observed-only | conflicting |
unresolved`. One example does not prove requiredness or enum completeness.
6. Write `api-inventory.md`, `contract-drift.md`, minimal redacted
   `sanitized-samples/`, and `api-recon.md`. Include operation, purpose,
   provenance, auth, request/response shapes, side effects, idempotency,
   dependencies, approved cases, confidence, capture coverage, and blockers.
7. Validate that no secrets or personal/customer data remain. Update the
   ledger with artifact links, drift counts, blocked cases, and spec revision.

## Boundaries

- Never infer negative contracts solely by mutating live requests. Negative
  and authorization testing requires approved scope and safe data.
- Never commit raw HAR by default. HAR use requires explicit sensitive-data
  acknowledgement, review/redaction, and deny-by-default replay.
- Do not generate tests here. Hand the inventory to `/forge-api-tests` or
  `/forge-scripts`.
- Treat GraphQL as operation name plus endpoint. Treat WebSocket/SSE/event
  protocols as gaps unless an applicable profile defines their contract.
