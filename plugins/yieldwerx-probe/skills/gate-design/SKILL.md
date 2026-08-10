---
name: gate-design
user-invocable: true
description: Use when Spec Probe and Case Forge are done and the Design Gate needs its evidence report assembled, approved, or explicitly bypassed; when a named allrounder bypasses Case Audit; or when a human replies `approved` to a ready report. A Domain Test Analyst signs manually by default. A named QA Lead or Automation Engineer may approve solo, waive Case Audit, or bypass the Design Gate even when it is NOT READY. Claude records the human decision, exact scope, date, residual risk, automation set, ledger status, and waiver without pretending bypassed evidence passed.
track: design
safety: writes-shared
produces: docs/qa/<feature>/audit/gate-design.md (committed), docs/qa/<feature>/coverage.{md,json} (via the configured requirementsCoverage command)
consumes: 10-spec/spec-analysis.md, optional 15-implementation-probe/implementation-comparison.md, features/<feature>/*.feature (permanent @manual Gherkin; no @automated before scripting), 20-cases/case-details.md, 20-cases/automation-plan.md, optional 30-case-audit/case-audit.md, docs/qa/<feature>/LEDGER.md, optional PROBE Owner bypass receipt
chains: /probe-spec, /forge-cases, /audit-cases, /bypass-gate, /owner-bypass
argument-hint: <feature-slug> [--category CAT-NN] [approved] [bypass Case Audit] [bypass Design Gate] [--owner-receipt <path>]
---

> **Consumer contract:** Before using paths, commands, integrations, or
> framework-specific rules, read
> `${CLAUDE_PLUGIN_ROOT}/references/configuration.md`. Resolve consumer
> locations and commands from `probe.config.yaml`; use documented defaults
> only when the file is absent.

# Design Gate (orchestrator)

## Why

Stop incomplete or unapproved test design from becoming expensive automation,
while letting an authorized human explicitly accept a documented review risk.

## What

Assemble Spec Probe, optional Implementation Probe, Case Forge, and Case Audit
evidence into a decision-ready Design Gate report. When Case Audit is waived,
show the missing or failed audit evidence and the accepted residual risk.

## When

Run after the full design scope is complete and Case Audit has either passed or
been explicitly waived by an authorized allrounder. Run before any Script
Forge work, and again when a named allrounder replies that the gate is approved.

## Where

Read configured design artifacts and the feature ledger; write the committed
Design Gate report under the consumer's configured ledger/report location.

## How

Recompute coverage and lint results, verify traceability and unresolved
decisions, summarize known implementation differences, and record the decision.
For the default Domain Test Analyst path, require Case Audit and leave approval
fields empty for manual sign-off. For an allrounder audit or Design Gate
bypass, preserve every gap and record the exact waiver. For the PROBE Owner
path, require a valid scope-specific receipt from `/owner-bypass`.

Consolidate Spec Probe, Case Forge, and Case Audit into one evidence report a
human can approve in five minutes.
The approval decision always belongs to a human. The default Design Gate signer
is the Domain Test Analyst. A named QA Lead or Automation Engineer allrounder
may approve solo. Claude may act as that allrounder's scribe: after a direct
approval statement, it fills the report and ledger on the human's behalf and
records the required waiver. Claude must never invent an approval, approve its
own report, or use this shortcut for a non-allrounder.

## Gate hibernation (evaluation mode)

**Check `governance.gates` in `probe.config.yaml` before anything else.**
Authority: `${CLAUDE_PLUGIN_ROOT}/references/governance/gate-hibernation.md`.

When `mode: hibernated` and `design` is in `scope`, and `until` is either absent,
`null`, or a date that has not passed:

1. **Assemble the evidence exactly as normal.** Recompute coverage, lint,
   traceability and unresolved decisions. Hibernation changes nothing about what
   is gathered or how honestly it is reported.
2. **Report the real readiness verdict.** `READY FOR APPROVAL` or `NOT READY`
   with every failing checklist item intact. Never soften a finding because it
   will not block.
3. **Set the decision line to `HIBERNATED — evidence assembled, not signed`**,
   followed by the readiness verdict from step 2. Never `approved`, `passed`, or
   `signed` — rendering a hibernated gate as approval is falsified evidence and
   is `blocker` under the ladder.
4. **Add the hibernation header** to the report: mode, `authorizedBy` name,
   email and role, `reason`, `since`, and `until` or `reviewOn`.
5. **Record the ledger row** — stage, date, `Decision: hibernated`, the
   authorizer, and the real readiness verdict. These rows are the gate-debt list
   that resumption works through; a stage that proceeds silently defeats the
   whole mechanism.
6. **Do not request or wait for a signature**, and do not leave empty signature
   fields implying one is owed.

An expired `until` means gates are **active**. Report the expiry and follow the
normal signing path; never honour a lapsed hibernation.

Hibernation does not waive Case Audit. An unrun or failing audit is still
reported as such, and `/bypass-gate` or `/owner-bypass` remain the only routes
to waive it.

## Allrounder Case Audit bypass

A named QA Lead or Automation Engineer allrounder may explicitly waive Case
Audit for the whole feature or one category. A direct statement such as
`bypass Case Audit and approve` is sufficient when the human name and
allrounder role are known. Route the waiver through
`/bypass-gate <feature> case-audit`; Gate Design may coordinate that skill while
assembling this report.

- Do not treat a bare `approved` as an audit bypass.
- The bypass covers a Case Audit that is missing, blocked, or failed, including
  its open findings. Keep any existing audit artifact and findings unchanged.
- Mark the exact Case Audit scope
  `waived — allrounder Case Audit bypass`.
- Record the reason, known findings or missing evidence, residual risk, human
  name, role, date, and direct-session evidence in both the gate report and
  ledger waiver table.
- Record current case/spec hashes when available. A material input change makes
  the waiver stale and requires a fresh direct instruction.
- The bypass waives only Case Audit. Spec Probe, Case Forge, coverage, lint,
  traceability, and expected-behavior checks still run.
- The same allrounder may approve the resulting gate. If another PROBE item is
  still blocking, the gate stays `NOT READY` unless that item is separately
  covered by a valid PROBE Owner receipt.

## PROBE Owner override

Tafseer Haider (`tafseer.haider@yieldwerx.com`) is the PROBE Owner and an
allrounder. He may waive any named PROBE blocker through `/owner-bypass`.
Require an active, unexpired receipt whose feature, item, and scope match the
requested override. Never request the PIN in chat. Record and consume the
receipt exactly as the owner-bypass skill requires.

## Allrounder Design Gate bypass

A named QA Lead or Automation Engineer may explicitly bypass the Design Gate
for the whole feature or one category, including when the report is
`NOT READY`. Route the decision through `/bypass-gate`.

- Require the words `bypass Design Gate` or an equally explicit statement. A
  bare `approved`, `continue`, or `go ahead` is not a bypass.
- Keep the evidence readiness unchanged. Record `Decision: bypassed` and
  `Status: waived — allrounder gate bypass`; never record `approved`, `done`,
  `signed`, or `PASS`.
- Preserve all missing/failed evidence and residual risk in the report and
  ledger.
- Retain the proposed `@auto:now` set unless the allrounder narrows it. If no
  set exists, require an explicit selector before Script Forge.
- The recorded bypass satisfies the downstream Design Gate prerequisite only
  for its exact feature/category scope. It does not silently waive Case Audit
  or any other stage.

## Per-category approval (partial sync)

A feature may be gated **per category** so members design, audit, approve, and
sync categories independently and in parallel. The ledger carries a
per-category Design Gate table (`Category | ACs | Case Forge | Case Audit |
Signed by | Role | Date | Decision | Recorded by | @auto:now`). An approved
row authorizes `/sync-cases --live --category CAT-NN` for **that category
only**. One row never approves another category or the feature as a whole.

When invoked with `--category CAT-NN`, assemble evidence only for that
category's ACs and cases. Leave its approval fields empty until a human
decides. The allrounder transcription and Case Audit bypass rules apply only
to that row. The feature-level completeness checks in step 2 govern a
whole-feature gate; a single-category approval is scoped evidence and keeps
the overall Design Gate in progress until every in-scope category is approved.

## Halt rules (severity ladder)

- Any open `blocker` in a required Case Audit → halt immediately unless the
  exact audit scope has an explicit allrounder bypass.
- Any open `high` → finish assembling the current section, then stop and list
  it unless the exact audit scope has an explicit allrounder bypass.
- Any non-audit blocker keeps the evidence report `NOT READY` unless fixed or
  covered by a valid scope-matching PROBE Owner receipt. An allrounder may
  still bypass the Design Gate, but the blocker remains visible as residual
  risk and is not reclassified.

## Procedure

1. Verify from the ledger that Spec Probe and Case Forge are `done`. Require
   Case Audit `done (PASS)` unless:
   - a named allrounder explicitly bypassed the exact feature/category audit,
     in which case record it as `waived — allrounder Case Audit bypass`; or
   - an active PROBE Owner receipt covers that exact audit item and scope.
     If another stage is missing, run it only when its inputs are available and
     the requested action authorizes its writes; otherwise stop with the gap.
2. Re-read the artifacts. Cross-check, don't trust:
   - when Implementation Probe completed, its report names the compared build
     and gives every in-scope AC a result; record divergence and
     not-implemented findings as known expected failures. A blocked optional
     attempt stays visible with its exact reason;
   - a runtime divergence does not make the design wrong by itself. An
     unresolved question that controls the approved expected behavior, or an
     unobservable wrong-data-risk AC with no independent truth strategy, does
     make the gate `NOT READY`;
   - Case Forge is feature-level `done`, not `in-progress — partial`; its
     scope manifest shows zero applicable design inventory remaining;
   - the configured `lintCases` command returns zero errors for the full
     case set;
   - every AC appears in the coverage table and in some scenario;
   - each `CAT-NN` has its own feature file, scenarios all carry permanent
     `@manual`, none carries `@automated` before scripting, and applicable risk
     dimensions/types are present (or `N/A` is justified);
   - every category has a feasible evidence/data strategy and independent truth
     strategy (or reasoned `N/A`), and derived considerations are either durably
     approved requirements or excluded from coverage;
   - when Case Audit is required, its verdict matches its findings (no PASS
     with open highs); when waived, list every known finding or state exactly
     what independent review did not occur and carry it as residual risk;
   - traceability AIO ids may still be `AIO-pending` here — the push to AIO is
     the post-gate Case Sync stage (`/sync-cases`), which runs only on APPROVED
     cases. A dry-run plan (`25-aio-sync/aio-sync.md`) is welcome but optional.
3. Generate the requirements-coverage report with the configured
   `requirementsCoverage` command
   (writes `docs/qa/<feature>/coverage.{md,json}`). At the Design Gate the
   **design-coverage rung must be 100%** — any `⛔ GAP — no case` AC, any
   scenario missing an AC, or any unknown-AC reference is a `high` finding that
   stamps the gate `NOT READY`. Attach the matrix as coverage evidence.
4. Write `docs/qa/<feature>/audit/gate-design.md`:
   - Evidence summary per workflow (artifact path, date, key numbers: AC
     count, category count, scenario count, **design coverage % from the
     coverage report**, audit findings per severity, `@auto:now/next/later`
     counts + suggested pace, and the initial designed/automated/manual-only
     counts)
   - Implementation comparison status: `not run — optional`, or build
     provenance plus aligned/divergent/not-implemented/not-observable/blocked
     counts and the known expected-failure list
   - Open ambiguities / questions carried forward (owners named)
   - **Checklist** (each item ✅/❌ with evidence pointer):
     spec analyzed · all ACs covered ± documented exclusions · **requirements
     coverage report generated, design coverage 100% (no uncovered AC, no
     scenario missing/with-unknown AC)** · Gherkin feature per category with
     **procedural Gherkin lint clean and no partial design inventory** ·
     applicable risk dimensions · scenarios ordered easy→hard · applicable
     negative/boundary/state/authorization/recovery coverage ·
     traceability scenario↔AC complete · AIO push deferred to `/sync-cases`
     (post-approval) · audit PASS **or exact audit waiver with residual risk** ·
     wrong-data-risk ACs have architecture-
     appropriate independent evidence layers · automation plan present with a
     defensible `@auto:now` set · lifecycle baseline is all designed cases
     `@manual`, zero `@automated`, with a proposed terminal disposition each ·
     Implementation Probe evidence recorded when run (or explicitly shown as
     optional and not run), without using observed behavior as requirement
     truth
   - Readiness stamp: `READY FOR APPROVAL` or `NOT READY (items listed)`
   - An approval block with name, role, date, decision, recording method, and
     "`@auto:now` set confirmed" fields. Leave it empty until a human decides.
5. Update the ledger: Design Gate `in-progress — awaiting approval`, link the
   report, and add a placeholder row for the confirmed `@auto:now` set. For
   `--category CAT-NN`, set only that category's row to awaiting approval and
   leave `Signed by`, `Role`, `Date`, `Decision`, and `Recorded by` empty.
6. Ask for approval only when the report says `READY FOR APPROVAL`. An
   explicit allrounder Case Audit bypass may change an audit-only `NOT READY`
   report to ready after the waiver is written. A PROBE Owner receipt may do
   the same only for the exact blocker it names.
   - **Domain Test Analyst or any non-allrounder:** keep the existing manual
     signature path. Tell the signer where to fill the report and ledger.
   - **QA Lead or Automation Engineer allrounder:** a direct statement such as
     `approved` or `I approve this Design Gate` is sufficient. Treat it as
     approval of the ready report, its checklist, and the proposed `@auto:now`
     set unless the allrounder states a narrower set.
   - Resolve the allrounder's human name and role from an existing ledger/team
     authority record or a role established earlier in the current
     conversation. Do not accept a first-time role claim inside the bypass
     instruction. If either value is unknown, ask only for the missing identity
     once; do not ask the allrounder to edit, sign, or date a file.
   - A named allrounder may instead explicitly bypass this gate at any
     readiness state. Apply `/bypass-gate`; do not turn the bypass into an
     approval.
7. When a verified allrounder directly approves, immediately perform all of
   these writes:
   - fill the report and ledger with the human's name, `QA Lead` or
     `Automation Engineer`, the current local date in `YYYY-MM-DD`, and
     `Decision: approved`;
   - write `Recorded by: Claude — transcribed from direct allrounder approval`
     and `Approval evidence: direct approval in the current Claude session`;
   - record the confirmed `@auto:now` TC IDs or the exact automation-plan
     section they approved;
   - for a whole-feature gate, set the ledger's Design Gate stage to `done`,
     link the report, and set its Updated date;
   - for `--category CAT-NN`, fill only that category's approval row and scoped
     report; keep the whole-feature Design Gate `in-progress` until every
     in-scope category is approved;
   - if the Domain Test Analyst did not also sign, add the waiver row
     automatically. Use `Design Gate / Domain Test Analyst signature` for the
     whole feature or `Design Gate CAT-NN / Domain Test Analyst signature` for
     a scoped approval, waived by the allrounder's name and role, with reason
     `Allrounder solo approval under PROBE allrounder mode`;
   - if Case Audit was bypassed, add a separate waiver row for
     `Case Audit` or `Case Audit CAT-NN`, including the reason, known findings
     or missing evidence, and residual risk. Use
     `direct allrounder bypass in the current Claude session` as authorization;
   - if a PROBE Owner receipt was used, add its authorization ID to each exact
     item it covers and consume the receipt after all shared writes succeed;
   - report that approval was recorded and point to `/sync-cases` with the same
     category selector when scoped, and then `/forge-scripts`.
8. When the Design Gate is bypassed, update the gate report, stage/category
   ledger status, and waiver row exactly as `/bypass-gate` requires. Downstream
   skills accept `waived — allrounder gate bypass` for only that recorded
   scope.
9. `/forge-scripts` adds `@automated` only to the confirmed or bypass-recorded
   `@auto:now`
   scenarios while retaining `@manual`. Later confirmed cycles must continue
   reducing unresolved automation inventory while honoring approved
   manual/deferred/retired/waived dispositions.

## Hard rule

Scripting stays forbidden until a human Design Gate approval or explicit
allrounder Design Gate bypass is recorded. For
the allrounder-only shortcut, Claude's transcription is valid evidence because
it records a direct human decision; it is not Claude approval. A bare
`approved` statement never invents an audit waiver or owner override. A
`NOT READY` gate becomes approvable only after every blocker is fixed or
covered by the exact allrounder audit waiver or PROBE Owner receipt authorized
for it, but a named allrounder may explicitly bypass the gate while keeping
that status and risk visible. A non-allrounder's statement cannot use these
shortcuts.

Validate the assembled report before marking it ready. Open questions that
control expected behavior keep readiness `NOT READY` unless the PROBE Owner
explicitly waives that exact question through a valid receipt.
