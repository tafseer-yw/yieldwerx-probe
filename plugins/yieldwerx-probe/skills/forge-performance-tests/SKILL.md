---
name: forge-performance-tests
user-invocable: true
description: Use when approved API performance requirements, reconciled endpoints, workload assumptions, and service objectives must become safe k6 smoke, load, spike, stress, or endurance tests. Creates threshold-gated workload code, isolated data lifecycle, environment guards, CI commands, and sanitized performance evidence without sending load to an unauthorized target.
track: scripting
safety: writes-local
produces: performance scenarios/helpers, performance workload manifest, .probe/artifacts/<feature>/60-performance-scripts/forge-notes.md
consumes: approved performance design, 40-api-recon/api-inventory.md, SLOs/workload model, active framework profile
argument-hint: <feature-slug> [--stack <profile-name>] [--profile smoke|load|spike|stress|endurance] [--operation operation-id]
---

> **Consumer contract:** Before using paths, commands, integrations, or
> framework-specific rules, read
> `${CLAUDE_PLUGIN_ROOT}/references/configuration.md`. Resolve consumer
> locations and commands from `probe.config.yaml`; use documented defaults
> only when the file is absent.

# Forge Performance Tests

## Why

Turn performance risk into reproducible workloads with explicit safety locks
and measurable pass/fail objectives.

## What

Create k6 API workloads for smoke, expected load, spike, stress, and endurance,
including data ownership, thresholds, summaries, and CI/scheduled-run wiring.

## When

Run after API Recon and design approval when latency, throughput, concurrency,
capacity, spike recovery, or sustained stability is in scope.

## Where

Write to the consumer performance paths and store cycle evidence under the
configured `60-performance-scripts` artifact directory.

## How

Freeze the approved workload and SLO, select one profile, implement a realistic
API journey with unique test-owned data, guard the target, validate at minimal
load, then run only the authorized intensity.

## Preconditions

1. Require approved operations, role, target environment, workload model,
   cleanup strategy, SLO/threshold, and maximum intended intensity.
2. Require `40-api-recon/api-inventory.md`; do not derive a workload from URLs
   guessed from UI code or from a recording alone.
3. Require explicit external-target and load authorization. Production also
   requires an approved, monitored change window and rollback/abort owner.
4. Stop when shared data, destructive side effects, rate-limit policy,
   observability, or environment capacity is unresolved.

## Procedure

1. Read [references/k6-design.md](references/k6-design.md) and the consumer's
   performance README/configuration. Inspect existing helpers before adding a
   new pattern.
2. Map approved TC/AC ids to operations, user journey, traffic mix, arrival or
   concurrency model, ramp, duration, data volume, and SLO. **Source the SLO
   and workload from the requirement**: the spec analysis's performance ACs and
   the tech design's stated objectives are the numbers, cited by id. A
   threshold with no such source is an open question for the requirement owner,
   never an invented figure — the skill already forbids inferring an SLO, and
   this is where that rule gets its input. Record every remaining assumption as
   an assumption, never as a product fact.
3. Choose the smallest applicable profile: smoke for script correctness, load
   for expected traffic, spike for a sudden surge, stress for capacity/breaking
   behavior, or endurance for leak/degradation risk.
4. Keep protocol code in domain helpers. Tag every critical operation, pass
   credentials only through runtime environment/secrets, and never print them.
5. Create unique run/VU/iteration data. Clean each record in the same iteration
   or with a proven teardown strategy; do not depend on teardown after an
   interrupted process for correctness.
6. Add business checks and thresholds for check rate, request failure rate,
   approved p95/p99 latency, and critical tagged operations. Checks without a
   threshold do not gate k6.
7. Add target guards: deny external load by default, require HTTPS externally,
   and require additional production authorization plus change reference.
8. Run static inspection, then the smoke profile. In the `playwright-bdd`
   profile, use `npm run perf:validate`, then `npm run perf:smoke` or the
   scenario-specific smoke command. Use `perf:load`, `perf:spike`,
   `perf:stress`, or `perf:endurance` only at the authorized target and
   intensity while observing the SUT; these commands deliberately require the
   consumer's load-authorization guard.
9. Write `60-performance-scripts/forge-notes.md` with TC/operation map,
   workload, SLO source, environment authorization, data lifecycle, commands,
   summary paths, results, bottlenecks, aborts, and uncovered risks.
10. Update the ledger. Keep API performance Gherkin business-readable when the
    profile uses it as a design record; map it to k6 rather than Playwright step
    definitions. Tag it `@api @testtype:performance`, so it remains outside AIO.

## Boundaries

- Never infer an SLO, expected RPS, concurrency, or production likeness.
- Never use a functional test pass rate as a performance objective.
- Never run stress/endurance as part of the ordinary Playwright all-suite.
- Never disable TLS verification or commit credentials, customer data, or raw
  response bodies in results.
- Never create, update, link, or report performance/API cases or results in
  Jira AIO Tests; retain repository-local TC/AC traceability.
- A load-generator bottleneck is not proof of a service capacity limit.
- Performance Gherkin specifies the business workload and outcome, not VU loop,
  raw HTTP, sleep, executor, or implementation mechanics.
