---
name: bypass-gate
user-invocable: true
description: Use when a named QA Lead or Automation Engineer allrounder explicitly says to bypass Case Audit, Script Audit, the PROBE Design Gate, Merge Gate, Ops Gate, all audits, or all applicable gates for a feature/category. Records a human waiver without pretending evidence passed, preserves missing or failed findings and residual risk, updates the exact audit/gate artifact and ledger, and lets downstream PROBE stages accept only the recorded scope.
track: governance
safety: writes-shared
produces: the named gate report and/or 30-case-audit/70-script-audit waiver record; docs/qa/<feature>/LEDGER.md
consumes: docs/qa/<feature>/LEDGER.md, available evidence for the named gate/audit, the allrounder's direct bypass statement
chains: /audit-cases, /audit-scripts, /gate-design, /gate-merge, /gate-ops
argument-hint: <feature-slug> <case-audit|script-audit|audits|design|merge|ops|all> [--category CAT-NN] [--reason "<reason>"]
---

> **Consumer contract:** Before using paths, commands, integrations, or
> framework-specific rules, read
> `${CLAUDE_PLUGIN_ROOT}/references/configuration.md`. Resolve consumer
> locations and commands from `probe.config.yaml`.

# Allrounder Gate and Audit Bypass

## Why

Let an accountable allrounder move work past a PROBE gate or audit after
explicitly accepting the visible risk, without making failed or missing
evidence look approved or passed.

## What

Waive Case Audit, Script Audit, the Design Gate, Merge Gate, Ops Gate, all
audits, or every applicable gate for one feature/category. Record the human
decision and make downstream PROBE stages recognize the exact bypass.

## When

Use only after a named QA Lead or Automation Engineer directly says to bypass
one or more named audits or gates. A bare `approved`, `continue`, or `go ahead`
is not a bypass.

## Where

Update each named audit/gate artifact and the feature ledger. Add one waiver row
per item so the decision is easy to find and audit.

## How

Resolve the human identity and role, expand the requested scope, preserve the
real evidence status, record the waiver and residual risk, and continue only
within that scope.

## Authority and scope

- Either allrounder role—`QA Lead` or `Automation Engineer`—may bypass Case
  Audit, Script Audit, or any PROBE gate.
- `all` means exactly the Design, Merge, and Ops Gates for the whole feature.
  Expand it and write three separate decisions; never record one vague
  wildcard row.
- `audits` means exactly Case Audit and Script Audit. Expand it and write two
  separate waiver records. `bypass all gates` never implies audit bypass, and
  `bypass all audits` never implies a gate bypass.
- A Design Gate bypass may be feature-wide or limited to one `CAT-NN`.
  Case Audit and Script Audit bypasses may also be feature-wide or limited to
  one category. Merge and Ops Gate bypasses are feature-wide. Reject
  `--category` with `merge`, `ops`, or `all`; never widen a category request
  silently.
- A gate bypass waives the gate decision only. It does not silently waive a
  stage, audit, external authorization, branch protection, destructive-action
  safeguard, or company security control.
- An audit bypass waives only the named independent-review prerequisite. It
  never changes a real audit verdict to PASS and never silently bypasses the
  Design, Merge, or Ops Gate.
- Use `/owner-bypass` for a non-gate/non-audit PROBE item that only the PROBE
  Owner is authorizing.
- Tafseer Haider (`tafseer.haider@yieldwerx.com`) may use this ordinary
  allrounder gate and audit authority. This committed authority record is
  sufficient identity/role evidence; on his direct current-session bypass
  statement, do not ask him to prove the role again. The owner PIN is required
  only for owner-only overrides; never request the PIN in chat.

## Procedure

1. Read the ledger and every named audit artifact or gate report. Resolve the human name and the
   exact role `QA Lead` or `Automation Engineer` from an existing ledger/team
   authority record or a role established earlier in the current conversation.
   A role claimed for the first time inside the bypass instruction is not
   enough. Ask only for missing identity; never infer an allrounder role.
2. Require an explicit bypass statement that names one audit/gate, says
   `bypass all gates`, or says `bypass all audits`. Reject `bypass everything`
   as ambiguous because it could include unrelated controls. If a separate reason is absent, record
   `Direct allrounder instruction; no separate reason provided` instead of
   blocking the request.
3. For `all`, expand to Design, Merge, and Ops. For `audits`, expand to Case
   Audit and Script Audit. Handle every item independently. Create a short
   placeholder artifact when evidence does not exist, record `not assembled`,
   and activate that exact named bypass now. Do not mark missing stages complete.
4. Assemble or refresh the available evidence for each named item. Never delete,
   soften, relabel, or hide a failed check. If the gate report does not exist,
   create a short report that names the evidence that was unavailable.
5. Keep the real gate verdict (`READY`, `NOT READY`, or `not assembled`) or
   audit verdict (`PASS`, `FAIL`, `blocked`, or `not assembled`) unchanged. Add
   a separate human waiver block:
   - `Decision: bypassed`;
   - gate status `waived — allrounder gate bypass`, Case Audit status
     `waived — allrounder Case Audit bypass`, or Script Audit status
     `waived — allrounder Script Audit bypass`;
   - human name and role;
   - current local date in `YYYY-MM-DD`;
   - exact feature/category scope;
   - reason;
   - known failed or missing evidence;
   - residual risk;
   - `Recorded by: Claude — transcribed from direct allrounder bypass`;
   - `Authorization: direct allrounder bypass in the current Claude session`.
6. Update the matching ledger stage or category row with the exact status from
   step 5. Do not write `done`, `approved`, `signed`, or `PASS` for a bypass.
7. Add one ledger waiver row per audit/gate with the same identity, scope, reason,
   known gap, residual risk, and direct-session authorization.
8. Bind audit bypasses to their exact inputs. A Case Audit bypass records the
   feature/category and current case/spec hashes when available. A Script Audit
   bypass records the feature/category, TC inventory, and exact commit or
   file-hash manifest. Any material change to those inputs makes the waiver
   stale and requires a new direct allrounder instruction; never carry it forward.
9. For a Design Gate bypass, retain the current proposed `@auto:now` set as the
   downstream automation set unless the allrounder states a narrower set.
   For a category bypass, use only the existing `@auto:now` cases inside that
   category; the category name is a scope limit, not an automation selection.
   If no `@auto:now` set exists, record that gap and require explicit TC IDs
   before Script Forge; never automate every case by assumption.
10. Apply downstream meaning:

- Case Audit bypass satisfies Gate Design and Script Forge's audit
  prerequisite for only the recorded feature/category scope.
- Script Audit bypass satisfies Stability Run and Merge Gate's audit
  prerequisite for only the recorded feature/category, TC inventory, and
  commit/file-hash manifest. It does not turn findings into PASS; open risk
  remains visible and may leave the Merge Gate `NOT READY`, requiring its own
  human decision or separate Merge Gate bypass.
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

11. Report the audits/gates bypassed, the remaining risk, and the next permitted
    stage. Do not claim that evidence passed.

## Hard rules

- Claude records the decision; Claude never invents or makes it.
- A gate bypass is not approval, and an audit bypass is not PASS. Neither is
  displayed as a green result.
- Apply only the exact feature/category, manifest, and named audit/gate scope.
- Keep every outstanding product, test, data, stability, and operational risk
  visible after the bypass.
