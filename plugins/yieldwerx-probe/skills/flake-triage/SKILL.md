---
name: flake-triage
user-invocable: true
description: Use when a scenario fails intermittently locally, in assisted execution, or in CI - preserves the original evidence, classifies root cause via flake-hunter, applies quarantine policy, and produces the exit-evidence trail. Cross-track.
track: cross
safety: writes-local
produces: .probe/artifacts/<feature>/flakes/FLAKE-NN.md; @quarantine tag changes on a branch
consumes: standardized failure-evidence packet or failing run evidence (traces, junit history, Allure), scenario source
argument-hint: <feature-slug-or-scenario> [evidence-path]
---

> **Consumer contract:** Before using paths, commands, integrations, or
> framework-specific rules, read
> `${CLAUDE_PLUGIN_ROOT}/references/configuration.md`. Resolve consumer
> locations and commands from `probe.config.yaml`; use documented defaults
> only when the file is absent.

# Flake Triage (cross-track)

## Why

Keep intermittent failures visible and measurable while preventing unreliable
tests from silently weakening a release gate.

## What

Classify the flake's root cause, apply controlled quarantine when required,
and maintain the evidence needed to remove that quarantine.

## When

Run as soon as a scenario behaves inconsistently during assisted execution,
locally, or in CI, including unexpected pass-on-retry behavior.

## Where

Use the consumer's evidence packets, history, traces, logs, environment
evidence, and code; write a stable `FLAKE-NN` artifact and any approved tag
change.

## How

Reproduce with controlled repeat runs, preserve the original failure packet,
delegate classification to the flake-hunter, separate product/test/environment
causes, quarantine within policy, and require consecutive-green exit evidence.

Read the shared
[failure-evidence contract](../execute-cases/references/failure-evidence-contract.md)
before changing classification or routing the failure.

Policy: a scenario failing intermittently in CI gets `@quarantine` within
24 hours and a triage artifact. It cannot exit quarantine without green x5
evidence. Assisted/manual execution does not add `@quarantine` unless an
implemented automated scenario exists; it still requires classification.

## Procedure

1. Ingest the original evidence packet when one exists. Preserve its occurrence
   ID, exact failing Gherkin step, failure-point screenshot, redaction record,
   and fingerprint across every reproduction. Never replace the first failure
   evidence with a later retry.
2. Launch the **flake-hunter** agent when available with the scenario and
   available evidence. It reproduces with the active profile's repeat command,
   inspects real traces when present, and returns reproduction odds,
   classification (`app-bug | sync-gap | test-bug | data | environment |
infra`), mechanism, recommended fix, and quarantine disposition. If the
   helper is unavailable, perform a bounded local classification and record it.

   For Playwright MCP-assisted execution, use bounded clean-state
   reproductions and browser/network evidence. A Playwright trace exists only
   when a runner or configured connector actually captured it; never claim one
   was collected.

3. Use a declared reproduction budget (default 10 executions or the
   CI-equivalent) and minimum evidence threshold. Write
   `.probe/artifacts/<feature>/flakes/FLAKE-NN.md` with analysis, date, exact
   commit/config, CI or assisted-run references, owner, review/expiry date,
   related issue, and affected gating/non-gating stages.
4. Make the quarantine decision:
   - Fix merged the same day and repeat-runs green: no quarantine; record the
     fix commit.
   - Otherwise, add `@quarantine` to an implemented nondeterministic test on a
     small branch/PR immediately. An `app-bug` also goes to `/bug-report` with
     the same evidence packet. Product nondeterminism remains an application
     defect; quarantine may isolate its signal but must not relabel the cause.
5. Record in the feature ledger, or the standing flake log for cross-feature
   scenarios: FLAKE id, classification, and quarantined yes/no/not-applicable.
6. For exit, execute the scenario green x5 consecutive on the same commit and
   config in CI-like conditions, document all runs, then remove `@quarantine`
   in the same PR that links the evidence. Without green x5, it stays.

## Rules

- Quarantined scenarios keep running in the non-gating CI stage. Quarantine is
  observation, not deletion.
- One artifact per flake; later occurrences append to its history.
- Keep `classification` separate from `rootCauseStatus`. Use `confirmed` only
  when the failure mechanism is directly evidenced; otherwise record
  `suspected` or `unknown` and the next diagnostic step.
- Verify quarantined scenarios still execute in the observation stage. Keep
  tag changes small and reversible and remove them only with linked evidence.
