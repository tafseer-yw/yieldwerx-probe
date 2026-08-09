---
name: change-impact
user-invocable: true
description: Use when frontend code changed (or before a dev pushes) to identify which test cases and scripts are impacted and propose the fixes — locator contract diff, feature-level impact, reasoned diff analysis. Frontend-embedded mode only. PROBE cross-track.
track: cross
safety: writes-local (reports only — never commits fixes)
produces: .probe/artifacts/change-impact/<base-or-sha>.md
consumes: git diff, ui-contract.json, ui-impact-map.json
argument-hint: [base-ref]
---

> **Consumer contract:** Before using paths, commands, integrations, or
> framework-specific rules, read
> `${CLAUDE_PLUGIN_ROOT}/references/configuration.md`. Resolve consumer
> locations and commands from `probe.config.yaml`; use documented defaults
> only when the file is absent.

# Cross-track — Change Impact (frontend-embedded mode only)

## Why

Expose which manual cases and automated scripts can drift when application UI
code changes, before that drift becomes a false failure or missed regression.

## What

Combine deterministic selector-contract checks with source-diff analysis to
produce a reasoned, feature-level test-impact report.

## When

Run when relevant frontend code changes, during developer pre-push review, or
when a renamed/removed UI contract is suspected.

## Where

Analyze the consumer repository's selected Git diff and configured UI maps;
write the result under the configured change-impact artifact location.

## How

Select an explicit base revision, run configured `uiCheck` and `uiImpact`
commands, inspect changed hunks, map them to cases and scripts, and propose
updates without silently changing either record.

When this framework lives inside a YieldWerx frontend repo, this workflow
tells the developer — BEFORE they push — which test cases and scripts their
UI changes break, and proposes the fixes. It layers reasoning on top of two
deterministic scripts; determinism first, AI on top.

## Preconditions

- `ui-impact-map.json` has a resolvable `frontendRoot`. If not (standalone
  framework repo, no frontend), STOP and report: change impact is n/a in
  standalone mode — this feature exists for frontend-embedded deployments.

## Procedure

1. Run the deterministic layer and capture both outputs verbatim:
   - configured `uiCheck` — locator-contract drift (missing/renamed testIds
     with consumers + impacted scenarios/cases);
   - configured `uiImpact` with `<base-ref>` (default base `origin/main`) —
     feature-level impact of every changed frontend file.
     If the remote/default ref is unavailable or stale, stop and select an explicit
     local base; never silently compare against the wrong history.
2. Read the ACTUAL diff hunks of the changed frontend files
   (`git diff <base>... -- <frontendRoot>`), not just the paths. Classify
   each change against the three drift surfaces:
   - **Locator contract** — testId/role/label changes (renames the static
     check flags, plus role/label changes it cannot see);
   - **Chart contract** — Plotly trace names, customdata shape, layout.meta
     fields (compare against `chartContract` in `ui-contract.json`);
   - **Flow/behavior** — added/removed/reordered steps, route changes, new
     required inputs — these stale the MANUAL cases (AIO) as well as scripts.
   - **Adjacent contracts** — API/schema, route guards/RBAC, feature flags,
     accessibility names, and analytics/events affected by the frontend diff.
3. Write `.probe/artifacts/change-impact/<base-or-short-sha>.md`:
   - summary table: change → surface → impacted page objects / scenarios /
     manual case ids (use the traceability chain from `ui-impact-map.json`);
   - **proposed fixes**: exact locator rename patches, updated step text for
     stale scenarios, updated manual-case steps — as diffs/suggestions,
     NEVER applied automatically;
   - the verify commands (ui:check + the tag-scoped test run).
4. Tell the user what to do next: apply the proposed fixes (or fix the
   frontend rename), rerun configured `uiCheck`, run the tag slice green, and
   only then push. Substantive script changes go through Script Audit
   like any other scripting work; manual-case changes re-sync to AIO.

## Rules

- **Never commit or auto-apply fixes** — this workflow proposes; humans (and
  Script Audit for scripts) dispose. Silent self-healing hides contract breaks.
- Unmapped changed frontend files are a finding, not noise: propose the
  missing `ui-impact-map.json` entry.
- If the manifest itself is stale (drift-guard selftest failing), fix that
  first — a stale manifest makes every other conclusion unreliable.
- Preserve rename detection and exclude generated/build artifacts from semantic
  impact unless their source contract also changed. Validate impact-map entries
  and traceability IDs before trusting the report. Backend/data changes belong
  in a separate change-impact workflow rather than being forced into this one.
