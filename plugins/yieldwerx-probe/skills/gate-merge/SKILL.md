---
name: gate-merge
user-invocable: true
description: Use when Script Forge, Script Audit, and Stability Run evidence must be assembled for Merge Gate sign-off, or when a named QA Lead or Automation Engineer explicitly bypasses the Merge Gate. Includes the hard testId-coverage check, preserves NOT READY findings, and records a bypass as a human waiver rather than a pass.
track: scripting
safety: writes-shared
produces: docs/qa/<feature>/audit/gate-merge.md (committed), docs/qa/<feature>/coverage.{md,json} (refreshed via the configured requirementsCoverage command)
consumes: features/<feature>/*.feature, 20-cases/automation-plan.md, 60-scripts/forge-notes.md, 70-script-audit/script-audit.md, 80-green-run/green-run.md, applicable observability gaps (40-ui-recon/testid-gaps.md only for UI), LEDGER.md
chains: /forge-scripts, /audit-scripts, /green-run, /bypass-gate
argument-hint: <feature-slug> [bypass Merge Gate]
---

> **Consumer contract:** Before using paths, commands, integrations, or
> framework-specific rules, read
> `${CLAUDE_PLUGIN_ROOT}/references/configuration.md`. Resolve consumer
> locations and commands from `probe.config.yaml`; use documented defaults
> only when the file is absent.

# Merge Gate (orchestrator)

## Why

Prevent unstable, unaudited, or insufficiently observable automation from
being merged into the shared test suite.

## What

Assemble Script Forge, Script Audit, Stability Run, coverage, and
profile-required observability evidence into a Merge Gate report.

## When

Run after the complete selected automation scope has passed audit and its
required consecutive-green stability run.

## Where

Read consumer scripting/run artifacts and ledger data; write the committed
Merge Gate report under the configured audit/report location.

## How

Cross-check evidence against the current commit, regenerate configured
coverage, verify no blocking gaps or stale subsets remain, and present a clear
ready/not-ready decision. Leave signatures blank unless recording a direct
allrounder gate bypass through `/bypass-gate`.

Consolidate the scripting-track evidence so an allrounder (QA Lead or
Automation Engineer)
can sign the merge. Claude never invents a signature and never merges the
branch. It may transcribe a named allrounder's explicit Merge Gate bypass into
the report and ledger.

## Allrounder Merge Gate bypass

A named QA Lead or Automation Engineer may say `bypass Merge Gate` even when
the report is `NOT READY`.

- Keep the evidence verdict and every failed/missing item unchanged.
- Record `Decision: bypassed` and
  `Status: waived — allrounder gate bypass` through `/bypass-gate`.
- The bypass satisfies only PROBE's Merge Gate prerequisite. It does not merge
  the branch, bypass branch protection, or authorize an external merge.
- A bare `approved`, `continue`, or `go ahead` is not a bypass.

## Halt rules

- Open `blocker` anywhere in Script Audit/Stability Run evidence → stop normal
  approval and stamp `NOT READY`; an explicit allrounder bypass may still be
  recorded without changing the finding.
- Open `high` → finish the report and stamp `NOT READY`; an explicit
  allrounder bypass may still be recorded.

## Procedure

1. Ledger check: Script Forge, Script Audit (PASS), and Stability Run (green ×3) all `done`. Missing → run the
   chain (/forge-scripts → /audit-scripts → /green-run) or stop and report.
2. Cross-verify the evidence (don't trust the artifacts' own summaries):
   - the configured `lintCases` command returns zero errors for the full
     approved case set;
   - Script Audit and Stability Run evidence are feature-level, not merely a
     scoped `SUBSET PASS`;
   - script-audit verdict consistent with its findings;
   - green-run table really shows 3 consecutive green, correct commit;
   - every approved P1 case has its architecture-appropriate independent
     evidence layers and truth strategy implemented;
   - AIO-eligible scenario ↔ AIO-id traceability complete; `@api`,
     `@testtype:api`, `@testtype:contract`, and `@testtype:performance` are explicitly `AIO: n/a`;
   - every designed scenario retains `@manual`, every runnable scenario also
     has `@automated`, bddgen emitted exactly the non-performance `@automated`
     set, and every automated performance TC maps to runnable k6 evidence;
   - designed/automated/manual-only counts match source effective tags
     (including inherited Feature/Rule tags), and every remaining manual-only
     case has an approved disposition. Unresolved cases require a scheduled
     Script Forge cycle; manual-permanent/deferred/retired/waived cases require
     exact rationale, owner, condition/expiry where relevant, and human approval.
3. **Observability-contract check (hard item):** for UI scenarios, from
   `40-ui-recon/testid-gaps.md`,
   every gap touching THIS feature is either fixed (testId present now),
   ticketed with a dev-team reference, or explicitly waived in the ledger.
   Unticketed, unwaived gaps → `NOT READY`. For non-UI scenarios, check the
   approved API/event/DB/audit/telemetry access gaps instead; testId is `N/A`.
4. Regenerate the requirements-coverage report after the green run:
   the configured `requirementsCoverage` command. At the Merge Gate the **automation** and
   **passing** rungs are the focus — the confirmed `@auto:now` ACs must show
   automated > 0 and be green (passing, 0 failing). Record the four rung %s and
   attach the updated `coverage.md`.
5. Write `docs/qa/<feature>/audit/gate-merge.md`:
   - Evidence summary per workflow (paths, dates, key numbers)
   - **Checklist** (✅/❌ + evidence pointer): audit PASS · green ×3 · lint +
     typecheck + bddgen clean · approved evidence layers on P1 · traceability complete ·
     permanent `@manual` retained · generated set equals `@automated` ·
     procedural Gherkin lint clean · no subset audit/run presented as
     feature-level evidence ·
     designed/automated/manual-only counts + backlog plan recorded ·
     **coverage report: `@auto:now` ACs automated & passing** ·
     tags/slices correct · applicable observability gaps fixed/ticketed/waived ·
     exploratory status recorded (Exploratory Run) · no unresolved blocker/high bugs from
     exploration
   - Readiness stamp + EMPTY signature block
6. Ledger: Merge Gate `in-progress — awaiting signature`, link report. Tell the
   allrounder what to review and where to sign. If a named allrounder directly
   says to bypass the gate, apply `/bypass-gate`, set the ledger stage to
   `waived — allrounder gate bypass`, add the separate waiver row, and keep the
   report's real readiness visible.

The stability evidence, audit, and report must identify the exact same commit
or file-hash manifest. Coverage excludes `DER-NN` and removed/superseded ACs.
