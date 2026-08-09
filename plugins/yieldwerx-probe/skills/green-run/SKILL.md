---
name: green-run
user-invocable: true
description: Use when audited scripts must prove stability — full local execution loop until green ×3 consecutive (flake screen), with run evidence attached. PROBE Stability Run stage.
track: scripting
safety: writes-local
produces: .probe/artifacts/<feature>/80-green-run/green-run.md (+ report copies)
consumes: branch e2e/<feature-slug> (audit PASS)
argument-hint: <feature-slug> [branch] [--scenario-type positive|functional|negative|edge|all] [--category CAT-NN] [--ac AC-NN] [--tc TC-id]
---

> **Consumer contract:** Before using paths, commands, integrations, or
> framework-specific rules, read
> `${CLAUDE_PLUGIN_ROOT}/references/configuration.md`. Resolve consumer
> locations and commands from `probe.config.yaml`; use documented defaults
> only when the file is absent.

# Stability Run

## Why

Demonstrate that newly automated behavior is repeatably reliable rather than
merely passing once by chance or retry.

## What

Execute the audited scope repeatedly, diagnose every failure, and produce an
immutable consecutive-green run record.

## When

Run after Script Audit passes; restart it after any code fix and reopen Script
Audit whenever that fix changes the automation.

## Where

Execute in the consumer's configured local/CI-equivalent environment and write
run evidence to the feature's configured `80-green-run` artifact.

## How

Generate the exact selected tests, record commit/config/environment for every
run, require three consecutive greens by default, reset on failure, and route
intermittent behavior through Flake Triage.

The flake screen: the feature's `@automated` scenarios must pass three
consecutive full runs before the Merge Gate. One green run proves nothing
about determinism. Permanent `@manual` does not exclude an automated scenario;
manual-only scenarios have no generated test to run.

## Preconditions

- A feature-level run requires Script Audit `done (PASS)`.
- A scoped run requires a matching scoped Script Audit PASS for the same TC
  inventory and exact commit/file-hash manifest.

## Procedure

1. Parse and record the optional selector and exact TC inventory. Reject an
   unknown or empty scope. Mark Stability Run `in-progress`. Record the exact commit, lockfile,
   configuration, environment class, and approved CI projects/slices. Run
   the configured `generateTests` command, then use the repository's exact
   tag/project contract for the
   feature plus required regression slice; do not hard-code Chromium or use an
   imprecise regex that selects unrelated scenarios.
2. Attempt up to **6 diagnostic runs** to obtain **3 consecutive** fully-green
   runs on the same recorded inputs. Record EVERY run —
   including the failures before the streak:
   | run # | timestamp | result | failed scenarios | duration |
3. Any failure resets the streak and triggers diagnosis, not a blind rerun:
   - launch the **flake-hunter** agent when available, otherwise perform the
     same classification locally;
   - its classification goes into the artifact (app-bug → /bug-report;
     sync-gap/test-bug → fix on the branch, which re-opens Script Audit for a delta
     audit of the fix; environment/infra → note and retry).
4. After the streak, run the scenarios once with `--repeat-each=3` or the
   equivalent suite-specific isolation probe. Any failure invalidates completion
   and reopens diagnosis. API-only/non-browser suites use their CI-native runner;
   performance TCs use the exact approved k6 profile and thresholds, never
   Playwright repetition.
5. Write `.probe/artifacts/<feature>/80-green-run/green-run.md`: run table,
   failures observed + classifications + fixes, final streak evidence,
   environment/mode used (mock vs live), report artifact paths.
6. Update the ledger: a scoped run records `subset PASS (green ×3 + isolation
PASS)` with exact TC ids and never completes the feature-level Stability Run.
   A complete run records `done (green ×3 + isolation PASS)` only after all
   conditions pass. If the run budget is exhausted, mark `blocked`
   with classifications and next action; never retry indefinitely.

## Rules

- Never achieve green by deleting/skipping a failing scenario or raising
  retries — that is falsifying the flake screen. Quarantine (with
  /flake-triage) is the honest escape hatch and it shows in the ledger.
- Evidence must be reproducible: record the exact command, env, and commit.
