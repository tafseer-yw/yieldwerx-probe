---
name: bypass-gate
user-invocable: true
description: Use when a named QA Lead or Automation Engineer allrounder explicitly says to bypass the PROBE Design Gate, Merge Gate, Ops Gate, or all applicable gates for a feature/category. Records a human gate waiver without pretending the gate passed, preserves missing or failed evidence and residual risk, updates the gate report and ledger, and lets downstream PROBE stages accept the exact bypassed scope.
track: governance
safety: writes-shared
produces: docs/qa/<feature>/audit/gate-<design|merge|ops>.md, docs/qa/<feature>/LEDGER.md
consumes: docs/qa/<feature>/LEDGER.md, available evidence for the named gate, the allrounder's direct bypass statement
chains: /gate-design, /gate-merge, /gate-ops
argument-hint: <feature-slug> <design|merge|ops|all> [--category CAT-NN] [--reason "<reason>"]
---

> **Consumer contract:** Before using paths, commands, integrations, or
> framework-specific rules, read
> `${CLAUDE_PLUGIN_ROOT}/references/configuration.md`. Resolve consumer
> locations and commands from `probe.config.yaml`.

# Allrounder Gate Bypass

## Why

Let an accountable allrounder move work past a PROBE gate after explicitly
accepting the visible risk, without making failed or missing evidence look
approved.

## What

Waive the Design Gate, Merge Gate, Ops Gate, or every applicable gate for one
feature/category. Record the human decision and make downstream PROBE stages
recognize the exact bypass.

## When

Use only after a named QA Lead or Automation Engineer directly says to bypass
one or more gates. A bare `approved`, `continue`, or `go ahead` is not a gate
bypass.

## Where

Update each named committed gate report and the feature ledger. Add one waiver
row per gate so the decision is easy to find and audit.

## How

Resolve the human identity and role, expand the requested gate scope, preserve
the real evidence status, record the waiver and residual risk, and continue
only within that scope.

## Authority and scope

- Either allrounder role—`QA Lead` or `Automation Engineer`—may bypass any
  PROBE gate.
- `all` means exactly the Design, Merge, and Ops Gates for the whole feature.
  Expand it and write three separate decisions; never record one vague
  wildcard row.
- A Design Gate bypass may be feature-wide or limited to one `CAT-NN`.
  Merge and Ops Gate bypasses are feature-wide. Reject `--category` with
  `merge`, `ops`, or `all`; never widen a category request silently.
- A gate bypass waives the gate decision only. It does not silently waive a
  stage, audit, external authorization, branch protection, destructive-action
  safeguard, or company security control.
- Use the separate allrounder Case Audit bypass when Case Audit must also be
  waived. Use `/owner-bypass` for a non-gate PROBE item that only the PROBE
  Owner is authorizing.
- Tafseer Haider (`tafseer.haider@yieldwerx.com`) may use this ordinary
  allrounder gate authority. The owner PIN is required for owner-only,
  non-gate overrides; never request the PIN in chat.

## Procedure

1. Read the ledger and every named gate report. Resolve the human name and the
   exact role `QA Lead` or `Automation Engineer` from an existing ledger/team
   authority record or a role established earlier in the current conversation.
   A role claimed for the first time inside the bypass instruction is not
   enough. Ask only for missing identity; never infer an allrounder role.
2. Require an explicit bypass statement that names one gate or says
   `bypass all gates`. Reject `bypass everything` as ambiguous because it could
   include non-gate controls. If a separate reason is absent, record
   `Direct allrounder instruction; no separate reason provided` instead of
   blocking the request.
3. For `all`, expand to Design, Merge, and Ops and handle each independently at
   feature scope. Create a short placeholder report when a future gate has no
   evidence yet, record `not assembled`, and activate that exact named bypass
   now. Do not mark the missing workflow stages complete.
4. Assemble or refresh the available evidence for each gate. Never delete,
   soften, relabel, or hide a failed check. If the gate report does not exist,
   create a short report that names the evidence that was unavailable.
5. In the report, keep the evidence verdict `READY`, `NOT READY`, or
   `not assembled`. Add a separate human decision block:
   - `Decision: bypassed`;
   - `Status: waived — allrounder gate bypass`;
   - human name and role;
   - current local date in `YYYY-MM-DD`;
   - exact feature/category scope;
   - reason;
   - known failed or missing evidence;
   - residual risk;
   - `Recorded by: Claude — transcribed from direct allrounder gate bypass`;
   - `Authorization: direct allrounder bypass in the current Claude session`.
6. Update the matching ledger stage or category row to
   `waived — allrounder gate bypass`. Do not write `done`, `approved`,
   `signed`, or `PASS`.
7. Add one ledger waiver row per gate with the same identity, scope, reason,
   known gap, residual risk, and direct-session authorization.
8. For a Design Gate bypass, retain the current proposed `@auto:now` set as the
   downstream automation set unless the allrounder states a narrower set.
   For a category bypass, use only the existing `@auto:now` cases inside that
   category; the category name is a scope limit, not an automation selection.
   If no `@auto:now` set exists, record that gap and require explicit TC IDs
   before Script Forge; never automate every case by assumption.
9. Apply downstream meaning:
   - Design Gate bypass authorizes Case Sync, UI Recon, Exploratory Run, and
     Script Forge for the exact recorded scope.
   - Merge Gate bypass satisfies PROBE's TestOps Promotion gate prerequisite
     after the branch is actually merged through the repository's normal
     authorization and branch-protection flow.
   - Ops Gate bypass may mark feature automation
     `Done — Ops Gate bypassed`, with the residual risk and any expiry/backfill
     obligation still visible. This is the human completion decision only;
     every unfinished workflow stage keeps its real ledger status and is listed
     in the Ops residual risk.
10. Report the gates bypassed, the remaining risk, and the next permitted
    stage. Do not claim that evidence passed.

## Hard rules

- Claude records the decision; Claude never invents or makes it.
- A gate bypass is not approval and is never displayed as a green/pass result.
- Apply only the exact feature/category and named gate scope.
- Keep every outstanding product, test, data, stability, and operational risk
  visible after the bypass.
