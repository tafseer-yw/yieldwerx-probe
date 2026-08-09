---
name: gate-ops
user-invocable: true
description: Use when TestOps Promotion evidence must be assembled for the Ops Gate, or when a named QA Lead or Automation Engineer explicitly bypasses the Ops Gate. Checks CI green ×N, report history, flake rate, AIO synchronization, and durable evidence; preserves NOT READY findings and records bypassed automation as Done with visible residual risk.
track: ops
safety: writes-shared
produces: docs/qa/<feature>/audit/gate-ops.md (committed), docs/qa/<feature>/coverage.{md,json} (refreshed via the configured requirementsCoverage command)
consumes: features/<feature>/*.feature, 60-scripts/forge-notes.md, 90-testops/testops.md, CI run history, Allure history, AIO Tests statuses, LEDGER.md
chains: /testops-promote, /bypass-gate
argument-hint: <feature-slug> [N-runs] [bypass Ops Gate]
---

> **Consumer contract:** Before using paths, commands, integrations, or
> framework-specific rules, read
> `${CLAUDE_PLUGIN_ROOT}/references/configuration.md`. Resolve consumer
> locations and commands from `probe.config.yaml`; use documented defaults
> only when the file is absent.

# Ops Gate (orchestrator)

## Why

Require durable operational proof that merged automation is stable, visible,
and maintainable before declaring it complete.

## What

Assemble CI history, reporting, flake rate, evidence retention, required
external synchronization, and manual-only inventory into the final gate report.

## When

Run after TestOps Promotion has executed in the real configured CI environment
for the required number of qualifying runs.

## Where

Read pipeline/report history and consumer PROBE evidence; write the committed
Ops Gate report and update the feature ledger only after human review.

## How

Verify green-run count and provenance, calculate flake and coverage measures,
check durable artifacts and exact exceptions, leave signature fields empty,
and block normal completion unless a human signs or a named allrounder
explicitly bypasses the gate through `/bypass-gate`.

The last gate: proves the automation survives contact with CI over time. A
signed Ops Gate means the feature's automation is **Done** in the ledger.
Claude never invents a signature. It may transcribe a named allrounder's
explicit Ops Gate bypass and mark
`Done — Ops Gate bypassed` with the residual risk still visible.

## Allrounder Ops Gate bypass

A named QA Lead or Automation Engineer may say `bypass Ops Gate` even when the
report is `NOT READY`.

- Keep the evidence verdict and every failed/missing item unchanged.
- Record `Decision: bypassed` and
  `Status: waived — allrounder gate bypass` through `/bypass-gate`.
- Set the automation outcome to `Done — Ops Gate bypassed`, not ordinary
  `Done`, and retain every expiry/backfill obligation.
- A bare `approved`, `continue`, or `go ahead` is not a bypass.

## Halt rules

- Feature scenario failing in the latest CI run → `blocker`; normal approval
  halts, while an explicit allrounder bypass keeps the failure visible.
- Any `@automated` scenario whose effective tags do not also include permanent
  `@manual` → `blocker`, halt immediately.
- Any manual-only case without an approved terminal disposition → `blocker`,
  halt immediately. Generic percentage/count dispositions are invalid.
- Flake rate above threshold or unsynced AIO statuses → `high`, stop after
  assembling; stamp `NOT READY`.

## Procedure

1. Ledger check: TestOps Promotion `done`. Default evidence window: **N = 5**
   consecutive pipeline runs (or the number passed in).
2. Compute the lifecycle inventory from parsed Gherkin effective tags,
   including tags inherited from `Feature` or `Rule`:
   - **designed** = scenarios whose effective tags include `@manual`;
   - **automated** = designed scenarios whose effective tags also include
     `@automated`;
   - **manual-only count** = designed scenarios whose effective tags include
     `@manual` but not `@automated`.
     The required default is **unresolved disposition count = 0**. Each manual-
     only case must be `manual-permanent`, `deferred-until:<condition/date>`,
     `retired`, or `waived`, with exact TC id, rationale, owner, applicable
     expiry/backfill condition, and human approval. Also fail lifecycle integrity
     if any `@automated` scenario lacks permanent `@manual`.
3. Collect evidence:
   - CI: last N runs containing the feature's scenarios — all green for those
     scenarios? Any retries recorded? (A pass-on-retry counts as a flake.)
   - **Flake rate**: flaky occurrences / actual scenario executions; record
     skipped, cancelled, not-selected, and infrastructure-aborted runs separately.
     Use the configured threshold (default **< 2%**) and require a configured
     minimum execution count per scenario (default N). Zero `@quarantine` entries without a
     documented /flake-triage exit plan.
   - Allure: history/trend clean for the feature's scenarios on the same test
     version/commit (no unexplained
     duration cliffs or status churn).
   - AIO Tests: for AIO-eligible scenarios, every original manual test record still exists with its stable
     id and manual status, and links to the latest automated scenario/result
     (synced or a documented sync job). No replacement or duplicate automated
     record stands in for it. API/contract/performance scenarios and results are
     repository-only and have no AIO write requirement.
   - CI integrity: the selected BDD slice ran once with framework self-tests,
     unexpected flakes failed, and reports plus `.probe/artifacts/**` were
     archived before cleanup. Visual/all evidence uses reviewed committed
     container baselines when in scope.
   - Apply the configured evidence policy when Jenkins/Allure is unavailable.
     By default local-as-CI is diagnostic only: mark `TODO(env)` and `NOT READY`.
4. Regenerate the requirements-coverage report against the latest CI results:
   the configured `requirementsCoverage` command (joining the configured
   execution and report evidence). At the Ops Gate
   the **execution** and **passing** rungs must be 100% for the automated set —
   every automated AC ran and is green; a `❌ failing` AC in the matrix is a
   `blocker`. Attach `coverage.md` as durable evidence and record the four rung %s.
5. Write `docs/qa/<feature>/audit/gate-ops.md`: evidence table (run ids,
   dates, results), designed/automated/manual-only inventory with exact TC ids,
   approved disposition details, flake numerator/actual-execution denominator,
   checklist (CI green ×N · unresolved dispositions zero · permanent `@manual`
   retained · generated set equals `@automated` · **requirements coverage:
   execution & passing 100% for the automated set, no failing AC** · flake <
   threshold · quarantine clean · Allure history clean · original AIO manual
   records retained and linked to automated results), readiness stamp,
   EMPTY gate signature block.
6. Ledger: Ops Gate `in-progress — awaiting signature`. On human signature the
   signer sets Ops Gate `done`. If a named allrounder directly says to bypass
   the gate, apply `/bypass-gate`, set the gate stage to
   `waived — allrounder gate bypass`, and set the automation outcome to
   `Done — Ops Gate bypassed`, subject to every recorded residual risk and
   expiry/backfill obligation.

AIO synchronization health is reported separately from product automation
quality: it may keep the operational gate `NOT READY`, but must not be
misclassified as a product/test correctness failure.
