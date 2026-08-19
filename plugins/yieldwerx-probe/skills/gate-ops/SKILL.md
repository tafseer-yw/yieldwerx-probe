---
name: gate-ops
user-invocable: true
description: Use when TestOps Promotion is done and the Ops Gate needs its evidence digest assembled, or when a human states they have reviewed the operational evidence and approve it. Assembles facts — CI run history, flake rate, report history, external sync state, coverage rungs, and the manual-only inventory — with no computed verdict, then records the human's decision with a timestamp. A recorded approval is what marks the feature's automation Done. PROBE Ops Gate.
track: ops
safety: writes-shared
produces: docs/qa/<feature>/audit/gate-ops.md (committed), docs/qa/<feature>/coverage.{md,json} (refreshed via the configured requirementsCoverage command)
consumes: features/<feature>/*.feature, 60-scripts/forge-notes.md, 90-testops/testops.md, CI run history, report history, external case-management statuses, LEDGER.md
chains: /testops-promote, /flake-triage
argument-hint: <feature-slug> [N-runs]
---

> **Consumer contract:** Before using paths, commands, integrations, or
> framework-specific rules, read
> `${CLAUDE_PLUGIN_ROOT}/references/configuration.md`. Resolve consumer
> locations and commands from `probe.config.yaml`; use documented defaults
> only when the file is absent.

# Ops Gate

## Why

Give a human the automation's operational record — how it has actually behaved in
CI over time — before the feature's automation is called Done, and record what
they decided.

## What

An evidence digest of facts from CI history, flake measurement, report history,
external synchronisation, coverage, and the manual-only inventory, followed by the
human's recorded approval.

## When

Run after TestOps Promotion has executed in the real configured CI environment
for the required number of qualifying runs, and again when a human states they
approve.

## Where

Read pipeline and report history plus consumer PROBE evidence; write the committed
Ops Gate report and update the feature ledger.

## How

Count the green runs and their provenance, measure flake against actual
executions, check durable evidence and external sync, list every gap plainly,
present the digest, and stop. On an explicit human approval, write the approval
row with a timestamp and record the automation as Done.

**Authority:** `${CLAUDE_PLUGIN_ROOT}/references/governance/human-gates.md`. A
gate is a record of a human decision. This skill computes no verdict and blocks
on nothing.

## Procedure

1. Read the ledger and `90-testops/testops.md`. Mark Ops Gate `in-progress`.
   Default evidence window: **N = 5** consecutive pipeline runs, or the number
   passed in.

2. Compute the lifecycle inventory from parsed Gherkin effective tags, including
   tags inherited from `Feature` or `Rule`:

   - **designed** — scenarios whose effective tags include `@manual`;
   - **automated** — designed scenarios whose effective tags also include
     `@automated`;
   - **manual-only** — designed scenarios with `@manual` and not `@automated`,
     listed by exact TC id with each one's disposition
     (`manual-permanent`, `deferred-until:<condition/date>`, `retired`, or none);
   - any `@automated` scenario that has lost permanent `@manual`.

3. Collect the operational facts:

   - **CI** — the last N runs containing this feature's scenarios, each run's
     result, and every retry recorded (a pass-on-retry is a flake);
   - **Flake rate** — flaky occurrences over actual scenario executions, with
     skipped, cancelled, not-selected, and infrastructure-aborted runs counted
     separately. Report the number against the configured threshold (default
     **< 2%**) and the configured minimum execution count per scenario; report
     the number, do not convert it into a verdict. List every `@quarantine` entry
     and whether it has a `/flake-triage` exit plan;
   - **Report history** — trend cleanliness for this feature's scenarios on the
     same test version and commit, and any unexplained duration cliff or status
     churn;
   - **External case management** — for eligible scenarios, whether each original
     manual record still exists with its stable id and manual status, and whether
     it links to the latest automated scenario and result. API, contract, and
     performance scenarios are recorded `AIO: n/a — repository-only`;
   - **CI integrity** — whether the selected slice ran once with framework
     self-tests, whether unexpected flakes failed the run, and whether reports and
     `.probe/artifacts/**` were archived before cleanup. Visual evidence uses
     reviewed committed container baselines when in scope;
   - when the configured pipeline or report provider is unreachable, say so and
     mark the affected facts `TODO(env)`. Local-as-CI evidence is labelled
     diagnostic, never presented as pipeline evidence.

4. Refresh the requirements-coverage report with the configured
   `requirementsCoverage` command, joining the configured execution and report
   evidence. Record all four rungs and name every AC in the automated set that
   did not run or is failing. Attach `coverage.md` as durable evidence.

5. Write `docs/qa/<feature>/audit/gate-ops.md`:

   - **Evidence table** — run ids, dates, results, retries.
   - **Lifecycle inventory** — designed / automated / manual-only with exact TC
     ids and each disposition.
   - **Flake** — numerator, actual-execution denominator, rate, threshold,
     quarantine list.
   - **Coverage** — the four rung percentages and the attached matrix.
   - **Gaps and open items** — a failing scenario in the latest run, an
     `@automated` scenario missing permanent `@manual`, a manual-only case with no
     disposition, a flake rate over threshold, an unexplained report trend, an
     unsynced external status, a missing archive, and any `TODO(env)` all belong
     here. Never soften or omit one.
   - **Approval** — an empty block matching the ledger's Gate approvals columns.

   No readiness stamp, no ✅/❌ checklist.

6. Update the ledger: Ops Gate `in-progress`, link the report. Present the digest
   and stop; do not recommend a decision.

7. When a human states their decision, append one row to the ledger's **Gate
   approvals** table — gate, scope, name, role, `YYYY-MM-DD HH:MM` local time,
   what they said they reviewed, and a link to this report — add
   `Recorded by: Claude — transcribed from the human's direct approval`, fill the
   same block in the report, set the Ops Gate stage to `done`, and record the
   feature's automation outcome as **Done**.

   Every expiry and backfill obligation attached to a manual-only disposition
   survives the approval. Carry them into the report's outcome line so Done never
   silently absorbs an outstanding commitment.

## Hard rules

- **Claude never writes an approval the human did not state.** Without one there
  is no row and the automation is not Done.
- External-sync health is reported separately from product and test correctness.
  A sync problem is a sync problem; it is never presented as a test failure, and a
  test failure is never softened into a sync note.
