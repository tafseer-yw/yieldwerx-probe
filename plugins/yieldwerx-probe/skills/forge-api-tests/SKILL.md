---
name: forge-api-tests
user-invocable: true
description: Use when approved functional, contract, workflow, security-baseline, or deterministic resiliency cases and a reconciled API inventory must become maintainable API automation from Swagger/OpenAPI or live endpoint evidence. Creates typed clients, runtime schemas, fixtures, positive/negative/auth/contract/resiliency tests, cleanup, and exact execution evidence; routes performance workloads to forge-performance-tests.
track: scripting
safety: writes-local
produces: API clients, schemas, fixtures/steps/specs, test data, .probe/artifacts/<feature>/60-api-scripts/forge-notes.md
consumes: approved feature cases, 40-api-recon/api-inventory.md, contract-drift.md, active framework profile
argument-hint: <feature-slug> [--tc TC-id] [--operation operation-id] [--layer contract|integration|ui-interception|all]
---

> **Consumer contract:** Before using paths, commands, integrations, or
> framework-specific rules, read
> `${CLAUDE_PLUGIN_ROOT}/references/configuration.md`. Resolve consumer
> locations and commands from `probe.config.yaml`; use documented defaults
> only when the file is absent.

# Forge API Tests

## Why

Turn approved API behavior into deterministic tests that validate runtime
contracts and business outcomes without coupling steps to raw HTTP details.

## What

Create typed clients, runtime response schemas, authentication/data fixtures,
API scenarios, UI network assertions/stubs, and cleanup logic.

## When

Run after API Recon and applicable case/design approval for API-only, hybrid,
contract, setup, synchronization, or interception coverage.

## Where

Write to consumer-profile paths and store the cycle handover under the
configured `60-api-scripts` artifact directory.

## How

Freeze authorized cases and operations, choose the correct test layer, build
thin domain clients with runtime validation, implement isolated assertions,
and execute the exact new scope.

## Preconditions

1. Require the Design Gate and Case Audit authorization enforced by
   `/forge-scripts`; selectors may narrow but never expand approved scope.
2. Require `40-api-recon/api-inventory.md` for each operation. Swagger alone
   is input to recon, not a substitute for drift and safety analysis.
3. Stop when auth, environment, destructive-operation permission, response
   contract, or cleanup strategy is unresolved.

## Procedure

1. Read [references/test-design.md](references/test-design.md). For the
   `playwright-bdd` profile, also read its coding conventions and inspect
   existing `src/api`, fixtures, aliases, and BDD bindings.
2. Compute `requested scope ∩ approved automate-now cases ∩ reconciled
operations`. Record unmatched, conflicting, unsafe, and automated items.
3. Choose `contract` (status/headers/schema), `integration` (business state),
   `ui-interception` (request or response-driven UI), or `all` only when
   approved cases require complementary evidence.
   Use business-readable Gherkin for stakeholder-facing workflows and
   acceptance behavior. Use data-driven TypeScript specs for exhaustive
   operation/schema/status matrices; do not explode a contract matrix into
   repetitive scenarios.
   Route performance/load/spike/stress/endurance requirements to
   `/forge-performance-tests`; do not implement them as repeated Playwright
   loops. Keep broad randomized fuzzing and active security scanning in separate
   explicitly authorized suites.
4. Centralize base URL, auth, logging, status handling, redaction, and retries
   in domain clients. Return `unknown` until a runtime schema validates it;
   infer TypeScript types from that schema.
5. Build role-authenticated fixtures and unique per-worker data. Seed via
   supported APIs where appropriate and clean up only test-owned data.
6. Assert exact expected statuses, required headers/fields, meaningful
   constraints, and business outcomes. Permit additive fields unless strict
   equality is an explicit compatibility requirement.
7. Retry safe reads and idempotent operations only. Retrying POST/PATCH
   requires a stable backend-supported idempotency key. Poll async workflows
   with bounded deadlines and terminal failure states, never hard sleeps.
8. Register browser routes before navigation/action, match method and URL
   narrowly, avoid unrelated traffic, and assert the UI outcome. HAR replay
   must abort unmatched in-scope calls and follow sensitive-data policy.
9. Run configured format, lint, typecheck, generation, and exact new scope.
   In the `playwright-bdd` profile, prefer `npm run test:api` for the API BDD
   slice after generation; run narrower data-driven contract specs when the
   consumer defines them. Do not mark a case automated until runnable.
10. Write `60-api-scripts/forge-notes.md` with operations/TC map, layers,
    files, live/stub mode, roles, data ownership, cleanup, drift dispositions,
    commands/results, and blockers. Update the ledger and preserve permanent
    `@manual` tags when the profile adds `@automated`.

## Boundaries

- Do not create shallow tests for every OpenAPI operation. Prioritize approved
  risk and behavior and document uncovered operations.
- Do not encode captured secrets or volatile identifiers in code or evidence.
- Do not create, update, link, or publish API/contract/performance cases or results in Jira
  AIO Tests. Retain repository-local TC/AC traceability only.
- Do not weaken schemas to accept conflicting responses; record contract drift.
- UI interception proves frontend behavior, not backend correctness.
- Keep raw HTTP out of step definitions; steps call fixtures/domain clients.
- Tag every HTTP-facing scenario `@api`, even when the one primary level is
  `@testtype:security`; use secondary `@api-workflow` or `@resiliency` tags as
  applicable. Keep exactly one primary `@testtype:`.
- Put API-only scenarios under `features/api/` or the consumer's equivalent,
  bindings under `steps/api/`, domain clients/schemas under `src/api/<domain>/`,
  and matrix specs under `tests/api/contracts/` when the profile supports these
  paths. API Gherkin names business operations/outcomes, never raw URLs or a
  generic `send METHOD request` vocabulary.
