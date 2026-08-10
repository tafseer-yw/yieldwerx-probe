---
name: testops-promote
user-invocable: true
description: Use after a signed or explicitly allrounder-bypassed Merge Gate to wire the feature's scenarios into the configured CI/CD and reporting stack — selected slices, isolated execution where required, fail-on-flake, quarantine policy, and durable PROBE evidence. PROBE TestOps Promotion stage.
track: ops
safety: writes-local
produces: .probe/artifacts/<feature>/90-testops/testops.md; CI config changes on a branch
consumes: merged designed scenarios with orthogonal @manual/@automated tags, consumer CI and automation configuration
argument-hint: <feature-slug>
---

> **Consumer contract:** Before using paths, commands, integrations, or
> framework-specific rules, read
> `${CLAUDE_PLUGIN_ROOT}/references/configuration.md`. Resolve consumer
> locations and commands from `probe.config.yaml`; use documented defaults
> only when the file is absent.

# TestOps Promotion

## Why

Move merged automation from developer evidence into a reliable, observable,
and repeatable operational pipeline.

## What

Configure CI slices, reporting, evidence retention, failure behavior, optional
external result linkage, and time budgets for the feature's automated cases.

## When

Run after the Merge Gate is signed or explicitly bypassed by a named
allrounder, and after the automation is actually merged to the consumer
repository's main integration branch.

## Where

Change consumer CI/configuration on a branch and write promotion evidence to
the feature's configured `90-testops` artifact.

## How

Verify lifecycle/tag selection, run every affected slice as CI will, confirm
reports and archives, reject unexpected quarantine, measure durations, and
require a real pipeline run before marking promotion complete.

Make the merged scenarios part of the pipeline's steady state.

## Preconditions

- Merge Gate signed, recorded as
  `waived — allrounder gate bypass` (check the ledger), **or hibernated** — read
  `governance.gates` in `probe.config.yaml`; authority is
  `${CLAUDE_PLUGIN_ROOT}/references/governance/gate-hibernation.md`. When
  `mode: hibernated` covers `merge` and `until` has not passed, the hibernation
  record satisfies this precondition. Record in the promotion artifact and the
  ledger: that the Merge Gate was hibernated, the authorizer, and **the gate's
  real readiness verdict at the time**.
- The branch is merged to main through its normal repository authorization and
  protection rules. **Hibernation never affects this** — it suspends a PROBE
  gate, not the repository's own merge controls, which PROBE does not own.

## Procedure

1. Mark TestOps Promotion `in-progress`; delegate to the **testops-engineer**
   agent when available, otherwise apply the same contract locally.
2. Lifecycle and slice verification: the configured test generator must select `@automated`, never
   exclude a scenario merely because permanent `@manual` is also present, and
   never generate a manual-only scenario. For each `@automated` scenario,
   confirm its tags put it in the intended stages — P1 → `@smoke` (PR gate)
   only if it fits the smoke time budget; every automated scenario →
   `@regression` (nightly); visual checks run only in the profile's approved
   isolated environment. API, contract, integration, queue/batch, and reconciliation tests
   use their own machine-readable slices. A P1 belongs in browser smoke only
   when its surface and time budget fit. Adjust non-lifecycle slice tags if wrong.
3. Run each affected slice with the consumer's configured commands exactly as
   CI does; record durations, environment, and effective selection. If
   smoke grew past its budget, flag which scenarios to demote.
4. Reporting and optional case-management linkage: confirm the new scenarios
   render correctly in the configured report provider; per-scenario logs and
   traces attach on failure. When case management is enabled, link each
   automated scenario/result to its original manual test record while
   preserving that record's stable id and manual status. Preview remote writes
   and perform them only with explicit authorization. Exclude `@api`,
   `@testtype:api`, `@testtype:contract`, and `@testtype:performance` scenarios/results from all AIO
   linkage or status writes; record them as `AIO: n/a — repository-only`.
5. Quarantine sweep: none of the promoted scenarios carry `@quarantine`; any
   quarantined scenario related to the feature has a /flake-triage artifact.
6. Write `.probe/artifacts/<feature>/90-testops/testops.md`: source-derived
   designed/automated/manual-only counts (using effective tags, including
   Feature/Rule inheritance), generated-set proof, stable external manual-record ↔
   automated-result links, slice map, exact commands/environment/commit,
   measured durations, report screenshots/paths, pipeline run links (when
   configured CI is reachable—otherwise the local-as-CI evidence and a
   `TODO(env): first real pipeline run` marker).
7. Confirm CI uses a single authoritative generated scenario set, fails on
   unexpected flakes, archives `.probe/artifacts/**` with reports, and has
   reviewed baselines when visual comparison is in scope. Keep
   slice ownership in a machine-readable configuration rather than prose alone.
8. Ledger: TestOps Promotion `done` + artifact link only when the selected
   automated contract really ran. Record manual-only TC ids and their approved
   terminal dispositions explicitly; unresolved dispositions block Ops Gate. Otherwise
   mark `blocked` with the external prerequisite; local-as-CI diagnostics never
   prove the Ops Gate.
