---
name: log-exploratory
user-invocable: true
description: Use when human or Playwright-MCP-assisted execution evidence exists, or execution was consciously skipped - consolidates exploratory charters, findings, and authorized case results so the feature ledger is complete. PROBE Exploratory Run stage.
track: design
safety: writes-local
produces: .probe/artifacts/<feature>/50-exploratory/exploratory-status.md + manual-run.md
consumes: tester notes, verbal summary, manual run results, or execute-cases summary
argument-hint: <feature-slug>
---

> **Consumer contract:** Before using paths, commands, integrations, or
> framework-specific rules, read
> `${CLAUDE_PLUGIN_ROOT}/references/configuration.md`. Resolve consumer
> locations and commands from `probe.config.yaml`; use documented defaults
> only when the file is absent.

# Exploratory Run

## Why

Preserve human testing evidence and learning that scripted checks do not
capture, while keeping release-risk decisions explicit.

## What

Consolidate exploratory charters, sessions, findings, and manual or assisted
executions of cases authorized by a recorded human Design Gate approval - or a
recorded decision not to execute them.

## When

Use after the Design Gate whenever manual, `/execute-cases`, or exploratory
work is performed, and complete it before a gate relies on that evidence.

## Where

Write session and manual-run records under the consumer feature's configured
`50-exploratory` artifact and link them from the ledger.

## How

Import assisted execution or collect tester evidence, record environment/data/
build and per-case results, route failures without changing their
classification, and distinguish unexecuted work from approved risk acceptance.

Execution may happen outside the framework or through `/execute-cases`, which
drives the live application through Playwright MCP. This skill records and
consolidates the evidence; it does not re-execute cases. Manual results are
real gate evidence while automation proceeds through Script Forge and
Stability Run when the ledger records that reliance.

## Procedure

1. Import the latest
   `50-exploratory/executions/execution-summary.md` when `/execute-cases` ran.
   Preserve its build, environment, executor, per-case results, evidence links,
   and failure fingerprints. Do not infer results for omitted or blocked cases.
   Otherwise collect either or both:
   - **Exploratory:** `done | partial | skipped`, charters, session owner/time/
     duration, findings with severity, repro when known, and bug/case follow-up.
   - **Manual run:** build, environment, executor, and exact per-case
     `pass | fail | blocked` result with a note and source for every non-pass.
2. Write `.probe/artifacts/<feature>/50-exploratory/exploratory-status.md` and
   `manual-run.md` for the applicable evidence. Only the exact approved scope
   counts as planned execution; other observations are exploratory findings.
3. Preview manual-status changes. Sync to Jira AIO only with explicit
   authorization for the listed eligible cases; otherwise record
   `sync: pending`. `/execute-cases` never performs that sync itself.
4. Preserve every assisted failure's evidence-packet classification. Route
   intermittent failures to `/flake-triage`; route supported application
   defects to `/bug-report`. Every blocker/high finding must link its bug or
   explicit triage disposition.
5. Update the ledger with Exploratory Run status and artifact links.

## Rules

- Never invent execution. `Skipped - no environment time before release` is a
  valid signable record only with a named risk acceptor.
- Manual results never substitute for automated green-run evidence at Merge
  Gate. A release relying on manual evidence requires a named human decision.
- Distinguish `not performed`, `not applicable`, and `risk accepted`.
- Include non-UI charters where relevant: queue recovery, policy/version
  transitions, isolation, reconciliation, and integration failure behavior.
