# PROBE — Plan · Review · Observe · Build · Evaluate

**Test with purpose. Release with proof.**

PROBE is a portable operating model for QA delivery end to end: requirement
analysis, case design, manual and exploratory testing, traceability, optional
case-management synchronization, automation, and operational evidence.

The five words name the rhythm; the named stages are how it is executed:

| Word         | What it means                                     | Stages                                                                 |
| ------------ | ------------------------------------------------- | ---------------------------------------------------------------------- |
| **Plan**     | turn a requirement into designed, stored cases    | Spec Probe · Case Forge · Case Sync                                    |
| **Review**   | attack the design before anyone builds on it      | Case Audit · **Design Gate**                                           |
| **Observe**  | look at the real application, not just the intent | Implementation Probe · UI Recon · Exploratory Run                      |
| **Build**    | implement the approved cases as automation        | Script Forge                                                           |
| **Evaluate** | prove it holds, then promote it                   | Script Audit · Stability Run · **Merge Gate** · TestOps · **Ops Gate** |

It is a mnemonic for the activities, not a strict running order — Observe spans
both the early implementation comparison and the post-Design-Gate locator pass.
The name is also a wafer-test pun: in the fab, _probing_ touches and measures
every die before packaging ships anything downstream.

**Status:** v2.8 · Authority for all QA workflow governance in this repo.
The plugin `skills/` implement this process; where a skill and this document
disagree, this document wins and the skill gets fixed in the same PR.
_v2.8: adds API Recon, typed API Test Forge, and guarded k6 Performance Test
Forge; makes API performance a QA-owned, repository-only test level and keeps
API/contract/performance cases and results out of AIO._
_v2.7.1: renamed the PROBE expansion to Plan · Review · Observe · Build ·
Evaluate (previously "Process for Review-gated Orchestrated BDD Engineering");
no stage, gate, policy, or identifier changed._
_v2.7: lets any named allrounder explicitly bypass the Design, Merge, Ops, or
all applicable gates while preserving the real evidence verdict and residual
risk. v2.6 let any named allrounder explicitly waive Case Audit and gave PROBE
Owner Tafseer Haider a PIN-authorized, scope-specific override for any PROBE
item without exposing the PIN to Claude. v2.5 let Claude transcribe a named allrounder's direct Design Gate approval,
date, automation-set confirmation, ledger status, and waiver. v2.4 made the
provided requirement package the sole requirement authority and limited
knowledgebase use to terminology and business context. v2.3 added
safe format migration and source reconciliation for existing spec
analysis artifacts. v2.2 required a `Verify that ...` summary and
Given/When/Then for every Workflow and Simple Rule acceptance criterion. v2.1 made visual candidacy
explicit per category and required deterministic visual scripting. v1.5 added
simple Workflow and Simple Rule acceptance criteria while keeping
the AC index stable for traceability. v1.4 added the optional Implementation
Probe, which compares approved intent
with an identified running build without making current behavior the
requirement. v1.3 made plain-language procedural Gherkin and safe scoped cycles
enforceable._

> **Why "PROBE":** wafer probing is literally how dies get tested — a probe
> card touches down on each die and measures it before the wafer ships. This
> process does the same to every feature: structured touchdowns (workflows),
> measured results (artifacts), and a ship/no-ship decision at each gate.

PROBE is the QA counterpart of a review-gated SDLC: no test scripting before
test design is signed, no merge before adversarial audit and a flake screen,
no "Done" before CI proves stability over time. It is sized for a small QA
team (3–5 people) — gates are evidence reports a human signs in minutes, not
ceremonies.

---

## 1. Team & authority (roles, not names)

PROBE assigns authority to **roles**. One person may hold more than one role
(on a 3-person team the two allrounder roles are usually two people and the
same person may act as both Domain Test Analyst and Manual QA Engineer);
what matters is that every approval maps to a role and a named human decision
in the ledger.

| Role                                   | Skill set                                                                                                                               | Authority                                                                                                                                                                                                                             |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **QA Lead** _(allrounder)_             | Automation architecture, delivery stack, CI/CD, process ownership, severity arbitration                                                 | Full sign-off on every gate, every checklist line; owns waiver decisions and the flake log                                                                                                                                            |
| **Automation Engineer** _(allrounder)_ | Scenario scripting, automation abstractions, specialized UI/data testing, flake triage, CI wiring                                       | Full sign-off on every gate, every checklist line                                                                                                                                                                                     |
| **Domain Test Analyst**                | Deep YieldWerx domain: bin semantics, cluster/ink rules, notch conventions, policy versions, rule-engine behavior; test design & review | Primary signer of the **Design Gate**; reviews case designs for domain correctness; grows into scripting over time                                                                                                                    |
| **Manual QA Engineer**                 | Manual test-case design and execution, exploratory testing, bug reporting, evidence discipline                                          | Owns Case Forge drafting (with the designer agent), `/execute-cases` assisted batches, and Exploratory Run records; co-reviewer on Design Gate evidence; files `/bug-report`; grows toward Domain Test Analyst or Automation Engineer |

**Allrounder mode.** Either allrounder may sign any gate solo — including
lines that normally belong to the Domain Test Analyst — but **every such
bypass is a waiver** recorded in the feature ledger's waiver table: who, what
was bypassed, why, date. There are **no silent waivers**; an unsigned line
that work proceeded past is a process violation, not a shortcut. The Domain
Test Analyst's review is the default path for the Design Gate, not a bottleneck:
if they are unavailable and the feature must move, an allrounder approves and
the waiver is recorded.

**Case Audit bypass.** A named QA Lead or Automation Engineer may explicitly
waive a missing, blocked, or failed Case Audit for the whole feature or one
category. A bare `approved` statement does not imply this waiver. The ledger
keeps the audit artifact and findings, or names the review that did not occur,
and records the reason and residual risk before the Design Gate proceeds.

**Script Audit bypass.** A named QA Lead or Automation Engineer may explicitly
waive a missing, blocked, or failed Script Audit for the whole feature or one
category. The waiver is bound to the exact TC inventory and commit/file-hash
manifest; any script change makes it stale. The ledger and audit artifact keep
the real verdict/findings (or `not assembled`), human identity, role, reason,
and residual risk. It satisfies Stability Run and Merge Gate's audit
prerequisite only for that exact scope; it is never PASS and never bypasses the
Merge Gate itself.

`bypass all audits` expands to separate Case Audit and Script Audit waivers.
`bypass all gates` still means only Design, Merge, and Ops. Neither phrase
silently includes the other.

**Gate bypass.** A named QA Lead or Automation Engineer may explicitly bypass
the Design Gate, Merge Gate, Ops Gate, or all applicable gates for an exact
feature/category scope. A bare `approved`, `continue`, or `go ahead` is not a
bypass. Claude keeps the gate's real evidence verdict, records
`Decision: bypassed` and `waived — allrounder gate bypass`, and writes the
human identity, role, date, reason, known gaps, and residual risk in the gate
report and ledger. `bypass all gates` means exactly the feature-wide Design,
Merge, and Ops Gates and expands to three decisions; category scope is
Design-only. `bypass everything` is rejected as ambiguous. Downstream stages
accept only the exact recorded scope. A gate bypass does not silently waive a
stage or audit and does not bypass external authorization or repository
protection.

**PROBE Owner override.** Tafseer Haider
(`tafseer.haider@yieldwerx.com`) is the PROBE Owner and an allrounder. He may
waive any named PROBE stage, gate, audit, checklist item, evidence requirement,
or sequencing rule through a short-lived receipt created by the local
PIN-protected `probe owner-bypass authorize` command. The PIN and generated
high-entropy signing key stay only in the user environment or gitignored
`.env`; neither enters chat, source control, the ledger, or an artifact. The override changes PROBE governance only. It
does not bypass tool/OS permissions, external-system authorization,
secret-handling safeguards, law, or company security controls.

**Manual QA is a first-class track, not a fallback.** Human-authorized cases
are executable by hand when the Design Gate approval or bypass is recorded —
manual execution results
recorded in Exploratory Run are gate evidence (they de-risk scripting and catch
app bugs before automation exists). A feature whose automation is still between
Script Forge and Stability Run can ship on
manual evidence if the release owner accepts that in writing in the ledger.

**Approval decisions are always human.** Gate orchestrators never approve their
own evidence. Design Gate has one narrow allrounder-only transcription rule:
after a named QA Lead or Automation Engineer directly says a `READY` Design
Gate is approved, Claude fills the report and ledger with that human's name,
role, decision, current date, confirmed `@auto:now` set, and the required
allrounder waiver. This records the human decision; it is not agent approval.
Other roles still sign manually. Allrounder Case/Script Audit bypasses,
allrounder gate bypasses, and PROBE Owner overrides are human waiver decisions
that Claude records; Claude never creates them.

---

## 2. The map

```
 DESIGN TRACK                  SCRIPTING TRACK                    OPS TRACK
 Spec Probe                    UI Recon (optional)                TestOps Promotion
 Implementation Probe
 (optional, before cases)
 Case Forge                    Script Forge                           │
 Case Audit                    Script Audit                           │
     │                         Stability Run                          │
 ┌───▼────────┐  Exploratory Run ─┐  │                          ┌────▼───────┐
 │ DESIGN     │─────────────────► │  │        ┌──────────────►  │ OPS        │
 │ GATE       │  (recorded any   ▼  ▼        │                 │ GATE       │
 └────────────┘  time before    ┌────────────┐                 └────────────┘
  signer: Domain Test Analyst   │ MERGE GATE │                  signer: any
  (or allrounder waiver)           │ GATE       │                 allrounder
                                   └────────────┘                 = feature
                                    signer: any                     automation
                                    allrounder                      DONE
```

Cross-track, invoked from anywhere: **/bug-report** (app defects — feeds the
automated bug lifecycle: final failures auto-collect as fingerprinted
candidates and classification gates what the configured `syncBugs` command files;
see the active integration/profile guidance), **/flake-triage**
(intermittent failures → quarantine policy), and **/change-impact**
(when the consumer provides change-impact commands: which cases/scripts a UI
change breaks, with proposed fixes).

### The development track

A fourth track builds and corrects the application these three test. It has its
own skills, agents, artifacts and policies, and its own authority document:
[DEV-TRACK.md](DEV-TRACK.md).

```
 DEVELOPMENT TRACK
 /scaffold-app        → an application whose QA contracts exist from commit one
 /build-feature       → approved requirement  → verified capability
 /revise-feature      → changed behaviour     + downstream-invalidation list
 /fix-defect          → bug candidate         → failing test → minimal fix
 /seed-testability    → recon gap list        → shipped selector/API contracts
 /review-code         → application code      → GO / NO-GO
 /ship-change         → hygiene, commits, PR body carrying the evidence
```

**The development track is gate-independent (DEV-TRACK policy D8).** No
development skill checks a ledger, waits on the Design, Merge, or Ops Gate, or
requires any QA artifact to exist. Every one of them runs on a repository that
has never used this process. Where a QA artifact is present it is consumed as
better input, never as a precondition — because gating a developer's ability to
build on a signature the QA team owns would make the track unusable.

With both tracks running, the two sides may meet at four optional seams, and
nowhere else:

1. `10-spec/spec-analysis.md` is read by both. Neither rewrites it; a
   requirement change goes through `/probe-spec --reconcile`.
2. A running build produced by the dev track is observed by
   `/probe-implementation`, `/ui-recon` and `/api-recon`.
3. A bug candidate from `/bug-report` is consumed by `/fix-defect`, which
   produces the evidence but never closes the candidate.
4. A dev change that invalidates QA artifacts emits a
   **downstream-invalidation list** naming exact feature files, TC ids, locator
   entries and fixtures — routed to `/update-cases`, `/change-impact`,
   `/ui-recon` or `/api-recon`, never amended by the dev skill itself.

**No development skill signs, assembles, or substitutes for a gate.** A
`/review-code` verdict is engineering evidence a human weighs; the Design, Merge
and Ops Gates remain exactly as specified in this document.

---

## 3. Workflows

Each workflow = one skill, one artifact, one ledger status. Artifacts live in
`.probe/artifacts/<feature>/<stage>/` (gitignored working/run evidence,
archived by CI before cleanup); the
permanent trail is `docs/qa/<feature>/` (ledger + promoted gate reports,
committed).

| Stage                                                               | Skill                   | What happens                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Output                                                                       |
| ------------------------------------------------------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| **Spec Probe**                                                      | `/probe-spec`           | Ingest the provided PRD/story/spec as the sole requirement authority; use the knowledgebase only for terminology and business context; start every acceptance criterion with a `Verify that ...` summary; write both Workflow and Simple Rule criteria with `Given/When/Then`; keep a stable AC index; record unclear wording, open questions, test data, and where to check each result. `--migrate-format` updates presentation only; `--reconcile` compares an existing analysis with the complete approved requirement and reports downstream impact. Creates the ledger.                                                                                                                 | `10-spec/spec-analysis.md` + optional `spec-reconciliation.md` + `LEDGER.md` |
| **Implementation Probe** _(optional when a reachable build exists)_ | `/probe-implementation` | Compare each approved AC with an identified running build and classify it as aligned, divergent, not implemented, not observable, or blocked. Current behavior is evidence, never requirement truth; extra behavior is recorded as undocumented.                                                                                                                                                                                                                                                                                                                                                                                                                                              | `15-implementation-probe/implementation-comparison.md` + evidence            |
| **Case Forge**                                                      | `/forge-cases`          | Design the **QA-owned Gherkin feature files, one per category** (`CAT-NN`) for UI, service/API, security, consumer contract, and API-performance behavior, in business-readable procedural style, ordered easy→hard, typed, and permanently tagged `@manual`; optional selectors can append one scenario-type/category/AC slice without declaring the feature complete. Record a visual candidate or specific visual `N/A` for every selected category. Produce literal expected values, candidacy tiers, and the **developer-owned coverage hand-off** for ACs whose right level is unit or implementation-internal integration. Designs only; the AIO push is a separate stage (Case Sync). | `features/<slug>/*.feature` + `20-cases/`                                    |
| ↳ **Case amendment**                                                | `/update-cases`         | Amend an **existing** case set in place when an open question is answered, an audit finding lands, the spec changes, or an expected value was wrong. Preserves TC ids and AIO keys, supersedes rather than deletes, and records what the change invalidates (a signed gate, a passing script, stale run evidence). Never regenerates a feature file.                                                                                                                                                                                                                                                                                                                                          | amended `features/<slug>/*.feature` + `20-cases/amendments/`                 |
| **Case Audit**                                                      | `/audit-cases`          | An independent, read-only auditor attacks coverage, traceability, atomicity, negative/boundary depth, data feasibility, and every category's visual candidate/`N/A` decision. A named allrounder may explicitly waive this stage through Design Gate while preserving the missing/failed evidence and residual risk.                                                                                                                                                                                                                                                                                                                                                                          | `30-case-audit/case-audit.md`                                                |
| **Design Gate**                                                     | `/gate-design`          | Orchestrates Spec Probe, Case Forge, and Case Audit evidence into a decision-ready report. A Domain Test Analyst signs manually. A named allrounder may approve solo, waive Case Audit, or explicitly bypass the Design Gate even when it is NOT READY; Claude preserves the evidence verdict and records the human decision, automation set, gaps, residual risk, and waiver.                                                                                                                                                                                                                                                                                                                | `docs/qa/<feature>/audit/gate-design.md`                                     |
| **Gate Bypass** _(governance decision)_                             | `/bypass-gate`          | Records a named allrounder's explicit Design, Merge, Ops, or all-gates bypass without presenting failed or missing evidence as passed. Updates the gate report, ledger stage, and one waiver row per gate; downstream stages accept only the exact scope.                                                                                                                                                                                                                                                                                                                                                                                                                                     | gate report + ledger waiver                                                  |
| **Owner Bypass** _(governance override)_                            | `/owner-bypass`         | Verifies a short-lived local receipt for Tafseer Haider, records an exact PROBE waiver and residual risk, applies only that scope, and consumes the receipt. The PIN never enters Claude or a committed file.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `.probe/authorizations/` + ledger waiver                                     |
| **Case Sync** _(optional case-management integration)_              | `/sync-cases`           | Push Design-Gate-approved or explicitly allrounder-bypassed Gherkin scenarios through the configured case-management adapter as durable records. Sync is idempotent, dry-run by default, and live-write gated on the exact human-authorized scope.                                                                                                                                                                                                                                                                                                                                                                                                                                            | `25-aio-sync/aio-sync.md` + external cases + traceability write-backs        |
| **UI Recon** _(optional when a live UI exists)_                     | `/ui-recon`             | Walk the exact Design-Gate-approved or allrounder-bypassed scope in the live app, harvest robust locators/screenshots, and flag observability or selector-contract gaps defined by the active profile.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | `40-ui-recon/`                                                               |
| **Assisted Case Execution** _(optional live UI companion)_          | `/execute-cases`        | Execute the exact approved Gherkin through one Playwright MCP browser batch, isolate independent cases, capture every step, and preserve a standardized evidence packet before retry or recovery. It never marks cases automated or syncs AIO results directly.                                                                                                                                                                                                                                                                                                                                                                                                                               | `50-exploratory/executions/`                                                 |
| **Exploratory Run**                                                 | `/log-exploratory`      | Consolidate exploratory charters and manual or assisted execution of the Design-Gate-approved or allrounder-bypassed scope, or an explicit signed risk acceptance for a skip.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `50-exploratory/`                                                            |
| **Script Forge**                                                    | `/forge-scripts`        | Implement the confirmed `@auto:now` Gherkin without re-authoring it; optional selectors constrain an automation cycle to scenario type/category/AC/TC. For `@visual`, use the active profile's named baseline, approved masks, deterministic runner, and comparison evidence. Add `@automated` when runnable. **Refuses without a recorded human Design Gate approval or exact allrounder Design Gate bypass.**                                                                                                                                                                                                                                                                               | branch + `60-scripts/forge-notes.md` + optional `oracle-design.md`           |
| **API Test Forge** *(optional)*                                     | `/forge-api-tests`      | Implement typed clients, request/response schemas, and contract, integration and interception tests against the reconciled API inventory. Runs alongside Script Forge on the same Design Gate authorization; it never substitutes for UI scenario coverage. | branch + `60-scripts/api-test-notes.md`                                      |
| **Performance Test Forge** *(optional)*                             | `/forge-performance-tests` | Implement guarded k6 smoke, load, spike, stress or endurance workloads with explicit thresholds and a named target environment. Never aimed at production without a recorded human authorization. | branch + `60-scripts/performance-notes.md`                                   |
| **Script Audit**                                                    | `/audit-scripts`        | Adversarially review the active profile's selector/synchronization rules, independent expected values, traceability, retry safety, role/auth propagation, and self-passing-test risks. A named allrounder may explicitly waive the exact current manifest through `/bypass-gate`; the real verdict and findings remain visible.                                                                                                                                                                                                                                                                                                                                                               | `70-script-audit/script-audit.md`                                            |
| **Stability Run**                                                   | `/green-run`            | Execute until **green ×3 consecutive** with every run recorded and every failure diagnosed. Requires Script Audit PASS or an exact current allrounder Script Audit bypass. Any fix invalidates either evidence and reopens Script Audit/bypass authorization before the streak restarts.                                                                                                                                                                                                                                                                                                                                                                                                      | `80-green-run/green-run.md`                                                  |
| **Merge Gate**                                                      | `/gate-merge`           | Orchestrate Script Forge, Script Audit, Stability Run, and observability evidence. A human signs before merge, or a named allrounder explicitly bypasses the PROBE gate while retaining every NOT READY risk. The bypass never performs or authorizes the repository merge itself.                                                                                                                                                                                                                                                                                                                                                                                                            | `docs/qa/<feature>/audit/gate-merge.md`                                      |
| **TestOps Promotion**                                               | `/testops-promote`      | After a signed or allrounder-bypassed Merge Gate and an actual authorized merge, wire CI execution, slicing, fail-on-flake behavior, reporting, durable evidence, and budgets.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `90-testops/testops.md`                                                      |
| **Ops Gate**                                                        | `/gate-ops`             | Require real CI green ×N, flake rate <2%, clean report history, durable evidence, external sync, and zero unresolved manual-only dispositions. A signature declares automation **Done**; an explicit allrounder bypass records **Done — Ops Gate bypassed** with every residual risk visible.                                                                                                                                                                                                                                                                                                                                                                                                 | `docs/qa/<feature>/audit/gate-ops.md`                                        |

### Legacy code mapping (historical references only)

Old artifacts may use these retired labels. Do not use them in new ledgers or instructions:
`W1` = Spec Probe, `W2` = Case Forge, `W3` = Case Audit, `G1` = Design Gate,
`W4` = UI Recon, `W5` = Exploratory Run, `W6` = Script Forge, `W7` = Script
Audit, `W8` = Stability Run, `G2` = Merge Gate, `W9` = TestOps Promotion,
and `G3` = Ops Gate.

**Ordering rules.** Spec Probe → Case Forge → Case Audit → Design Gate is the
default. A named allrounder may replace Case Audit with an explicit recorded
audit waiver for the same feature/category scope. Implementation Probe may run between Spec Probe and Case Forge when a
reachable build exists. If explicitly requested, it must finish, be blocked
with a recorded reason, or be human-waived before Case Forge; an untouched
`pending — optional` row does not block design. Case Sync runs after Design
Gate approval or an exact allrounder gate bypass is recorded (only
human-authorized cases reach AIO) and re-runs whenever scenarios change; a dry-run may be reviewed
earlier. UI Recon and Exploratory Run occur after Design Gate and before Merge
Gate; UI Recon precedes Script Forge whenever an environment exists. Script
Forge → Script Audit → Stability Run → Merge Gate is strict by default. A named
allrounder may replace Script Audit with an explicit, manifest-bound audit
waiver; every finding remains visible, and Merge Gate is still a separate human
decision. TestOps
Promotion → Ops Gate is strict by default. A named allrounder may explicitly
bypass any gate without changing the underlying evidence verdict.
Rework loops (audit FAIL → forge) are normal and stay visible in the ledger.

**Scoped-cycle rule.** Case Forge, Case Audit, Script Forge, Script Audit, and
Stability Run accept `--scenario-type`, `--category`, `--ac`, and—after case
allocation—`--tc` where applicable. Selectors intersect; unknown or zero-match
selectors fail closed. A scoped cycle records exact TC ids and may report
`SUBSET PASS`, but it never marks the feature-level stage done and never makes a
gate ready. Full gates still require reconciled feature-wide evidence.

**Amendments are not a rework loop.** Once a category's cases exist, changes go
through `/update-cases`, not a second `/forge-cases` run — re-forging renumbers TC
ids and orphans the AIO records bound to them. An amendment may land at **any**
point in the lifecycle, including after a gate is signed, so it must declare what
it invalidates: an `expected-value`, `structural`, or `scope` amendment voids the
Design Gate approval for the cases it touched, breaks any script bound to them,
and makes prior run evidence stale. Those invalidations are recorded in the
ledger's **Case amendments** table, which every later gate reads to check whether
its evidence predates a change.

---

## 4. The feature ledger

Every feature gets `docs/qa/<feature-slug>/LEDGER.md` — created by
`/probe-spec` from its embedded template, committed, and updated by every
workflow. It is the single glance-view of where a feature stands:

- the named-stage status table (`pending · in-progress · done · blocked · waived · n/a`),
- the three gate approval blocks (human decisions; Design Gate allows
  allrounder-only Claude transcription),
- the waiver table (every bypass, no exceptions, including scope, residual
  risk, and authorization evidence),
- links to every artifact and bug/flake record.

If the ledger and reality disagree, fixing the ledger is part of the work —
an out-of-date ledger fails the next gate's checklist.

---

## 5. Severity ladder (all auditor skills and agents)

| Severity  | Meaning                                                                                                                                                | Orchestrator behavior                                                                               |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| `blocker` | Wrong data shown to users, self-passing test, falsified evidence, unverifiable chart numbers                                                           | **Halt immediately** unless the exact item has an authorized human waiver; keep the blocker visible |
| `high`    | Broken policy: raw CSS/XPath, hard wait, missing render sync, single-layer P1 scenario, traceability break, missing negative coverage, infeasible data | **Halt after the current step**; gate NOT READY until fixed or waived                               |
| `medium`  | Convention drift: fat steps, assertions in POMs, tag/label mistakes, vague P2 expectations                                                             | Recorded; signer judges                                                                             |
| `low`     | Style, naming, minor doc gaps                                                                                                                          | Recorded                                                                                            |
| `info`    | Observations, improvement ideas                                                                                                                        | Recorded                                                                                            |

**Wrong-data findings on wafer maps are always `blocker`** — a chart that
contradicts the numerical oracle or the database is never "minor", whatever
the delta. Yield numbers are the product; showing wrong ones quietly is the
worst failure mode this process exists to catch.

---

## 6. Standing policies

### P1 — Selector and observability policy

Every interactive or assertable surface needs a stable automation contract.
The consumer profile defines the selector order, prohibited techniques, and
which missing hooks block the Merge Gate. Script Audit applies that declared
contract; it does not invent framework rules.

The bundled Playwright BDD profile requires stable test IDs for application
chrome, permits semantic role locators where genuinely stable, forbids raw
CSS/XPath, and defines special handling for canvas/Plotly surfaces. Those
rules apply only when that profile is active.

### P2 — Independent verification

Every critical-path scenario names the independent evidence surfaces required
to prove its business result. Use the smallest defensible combination—such as
UI plus oracle, API plus database, export plus independently calculated
totals—and never calculate the expected value by asking the same implementation
under test. The spec analysis records applicable surfaces and explicit `N/A`
rationale. A critical result supported only by its own displayed/returned
value is a Script Audit `high`; self-derived expected values are `blocker`.

### P3 — Traceability

Spec acceptance criterion → AIO test case id → tagged scenario. Any break in
that chain = `high`. Scenarios that exist in no approved case are audit
findings, not initiative.

### P4 — No scripting before the Design Gate

`/forge-scripts` checks the ledger and **refuses** until a human Design Gate
approval or explicit allrounder Design Gate bypass is recorded. A manual
signature is valid. An allrounder-only Claude transcription is valid when it
names the allrounder, date, exact scope, confirmed/bypass-recorded
`@auto:now`, and all waivers. A bypass records `Decision: bypassed` and keeps
the evidence gaps visible; it never claims approval. This prevents Claude from
silently deciding that unreviewed cases are safe to automate.

### P5 — Flake quarantine

A scenario failing intermittently in CI gets `@quarantine` **within 24
hours** plus a `/flake-triage` artifact (root-cause classified by the
flake-hunter agent, measured with repeat-runs). Quarantined scenarios keep
running in a non-gating CI stage — quarantine is observation, not deletion.
Exit requires **green ×5 consecutive** evidence recorded in the artifact and
removed in the same PR that links it. Deleting or skipping a flaky test to
green a gate is evidence falsification → `blocker`.

### P6 — CLAUDE.md stays current

Any structural framework change (new module, moved directory, changed
convention, new tag) updates `CLAUDE.md` **in the same PR**. Phase/status
changes update `docs/PHASES.md` in the same commit. Stale working agreements
are how conventions die.

### P7 — Token discipline (each stage reuses the last, not the source)

Every subagent cold-starts its own context — it does **not** inherit the
parent's or a prior stage's tokens, and cross-stage prompt-cache reuse between
subagent invocations does **not** happen. So cost is controlled by what each
stage is made to read, not by caching. Five standing rules:

1. **Distillation carry-forward.** Each stage reads the **prior stage's
   distilled artifact**, never the raw source again. `10-spec/spec-analysis.md`
   is the single downstream source of truth for the requirement — Case Forge onward do
   **not** re-open the raw PRD/story unless a `TODO(spec)` marker explicitly
   points back to it. Every artifact must be self-contained enough that the next
   stage needs nothing above it.
2. **Model tiering.** Mechanical stages (ledger updates, AIO sync, gate-report
   assembly, format-only passes) run on a **cheaper model** (`model: haiku` in
   skill/agent frontmatter). The strong model is reserved for reasoning-heavy
   stages: spec analysis, case design, adversarial audits, oracle design,
   scripting.
3. **Fork the heavy reads.** A large source (raw PRD, reference source tree)
   is read **once** by a delegated fork/subagent that returns only a compact
   digest — the orchestrator never absorbs the full source. Spec Probe ingests the PRD
   this way and emits the digest.
4. **Narrow, hash-guarded reads.** Read the specific sections a stage needs
   (targeted Read ranges + `grep`), not whole files "to be safe". Audit stages
   record input **file hashes**; on a rework loop, skip re-reading inputs whose
   hash is unchanged.
5. **Fan-out discipline.** A fresh subagent re-pays the cold-start
   `CLAUDE.md` + system-prompt cost, so spawn one only when it buys
   **independence** (adversarial auditors — required) or **parallelism**.
   Inline mechanical single passes instead of delegating them.

Plugin-bundled profile references do not load automatically. A stage explicitly
reads only the applicable active-profile file (locator policy, chart contract,
or coding conventions) before it changes matching code. Consumer-owned
path-scoped rules still load according to the consumer tool. This keeps
design-only stages from carrying code-level convention text. Keep consumer
project instructions lean; push code detail into profile references and deep
reference into docs.
Token discipline never overrides a quality policy — when P7 conflicts with an
adversarial-review or three-layer requirement, the quality policy wins.

### P8 — Automation candidacy & pacing (automate deliberately, not all at once)

Test cases are designed as Gherkin in Case Forge, but they are **not** all automated at
once. Each scenario gets an effort estimate and an automation-candidacy tier
(`@auto:now` / `@auto:next` / `@auto:later`); Script Forge automates only the `@auto:now`
set a human confirmed at the Design Gate. Everything is automated eventually —
the tier is _sequencing_, and cases held back are covered by exploratory/manual
testing (Exploratory Run) until the feature stabilizes. The designer recommends; the Design Gate
signer decides. A wrong-data-risk scenario parked `@auto:later` is a case-audit
`high`. Authority for the rubric and the pace model:
[docs/automation-prioritization.md](../governance/automation-prioritization.md).

### P9 — Orthogonal case lifecycle (retain the case, add execution)

`@manual` and `@automated` are cumulative, orthogonal lifecycle tags:

- Case Forge adds `@manual` to every designed scenario. It is permanent
  provenance and keeps the scenario available for human execution.
- Script Forge never deletes or re-authors an approved scenario. When its
  implementation is runnable, Script Forge adds `@automated` and retains
  `@manual`, so a runnable designed case carries both tags.
- **Manual-only** means the scenario's effective tags — including tags
  inherited from its Feature or Rule — contain `@manual` but not
  `@automated`.
- `bddgen` selects `@automated`; `@manual` is never an exclusion. Successive
  Script Forge cycles add `@automated` to the approved backlog until the
  manual-only inventory reaches zero.

The Ops Gate default is an exact manual-only count of **0**. An exception is
valid only when a human signs a narrow waiver listing the exact `TC-*` ids,
rationale, owner, expiry/backfill date, and retained manual coverage. A generic
percentage or open-ended backlog waiver is invalid and keeps the gate NOT
READY.

### P10 — Manual-procedural Gherkin is the case of record

Feature files are written for the Manual QA Engineer and product/domain
reviewer first. Every case has an objective and visible, sequential actions
using words such as `Open`, `Click`, `Select`, `Enter`, `Upload`, `Wait until`,
and `Verify`. Steps name visible labels and exact values or Examples
placeholders. Product vocabulary such as bin, wafer, SAR, or policy is welcome.

Automation architecture does not leak into the manual procedure: `oracle`,
`fixture`, locator/testId/DOM/CSS/XPath, render synchronization, seeded mocks,
page objects, and implementation methods belong in case details, step
definitions, or supporting code. Every Scenario Outline placeholder must have
an Examples header. The configured `lintCases` command enforces the
deterministic portion of this policy; Case Audit judges the remaining human
usability. Long end-to-end workflows are allowed when the complete journey is
the intended case, but vague or non-executable steps are not.

### P11 — Scoped cycles narrow work, never approval

The shared selector vocabulary is:

```
--scenario-type positive|functional|negative|edge|all
--category CAT-NN
--ac AC-NN
--tc <TC-id>
```

`functional` is a scenario type, distinct from the `@testtype:` test level.
The shorthand `/forge-cases functional` or `/forge-scripts functional` is
allowed only when the feature is unambiguous from the request or exactly one
active ledger; otherwise the skill must request the feature slug.
Case Forge may append a previously undesigned slice and records remaining
inventory in `20-cases/scope-manifest.md`; it never rewrites an existing case.
Script Forge applies a selector only after calculating the approved or
bypass-recorded `@auto:now` set, so the work set is requested scope ∩
human-authorized scope ∩ manual-only.
Audits and Stability Run must use the same exact TC inventory and commit/hash.
Subset evidence is useful iteration evidence, not a feature-level gate result.

### P12 — Intended and observed behavior stay separate

Implementation Probe compares `10-spec/spec-analysis.md` with a running,
identified build. Its results are `aligned`, `divergent`, `not-implemented`,
`not-observable`, or `blocked`; behavior outside the approved AC inventory is
`undocumented`. It never edits an AC, resolves an ambiguity, or treats the
application as the oracle for its own expected result.

Case Forge continues to design from approved intent. A confirmed mismatch is a
known expected failure and can become a `/bug-report` candidate, but the skill
does not file it automatically. A mismatch does not block sound test design;
an unresolved question that controls the expected behavior does. Design Gate
reports the comparison when it ran. Merge and Ops Gates still block unresolved
application defects unless a human signs a narrow waiver. UI Recon remains a
later, separate activity for locator and `data-testid` discovery.

### P13 — Acceptance criteria use simple QA language

Spec Probe classifies each AC, but both formats use the same readable shape:

- **Workflow:** use `Given`, `When`, and `Then` when a user or system action
  causes a result or state change.
- **Simple Rule:** also use `Given`, `When`, and `Then` for a layout, limit,
  allowed value, data rule, calculation, or measurable non-functional rule.
  Use the smallest context and action supported by the source. Every
  `Then`/`And` result uses `must` or `must not`.

Every AC starts with `**Summary:** Verify that ...` before its fenced Gherkin
block. Do not invent a click or screen just to make a Simple Rule fit Gherkin.

The AC describes the required result, not the detailed manual test. Case Forge
later adds visible, step-by-step actions and the positive, negative, and edge
coverage. Each active AC keeps one stable `AC-NN`, one index row, and one
definition. Use short product words, exact values, and results a QA can see or
measure. Do not use vague words such as "fast", "properly", "correctly", or
"user-friendly", and do not use implementation words unless the approved
requirement is specifically about that technical item.

### P14 — The PRD owns requirements; knowledge provides context

The provided approved requirement package—PRD, story, ticket, addendum, or
durable decision supplied with the work—is the sole requirement source of
truth. Every `AC`, `AMB`, and `OOS` source points to that package's section or
page.

The versioned external YieldWerx knowledgebase is reference context only. Spec
Probe may use `yw:ask-yieldwerx` to understand terminology, modules, and the
overall business picture. It must not create or complete an AC, provide a
missing value/condition/result, resolve unclear PRD wording, or override the
provided requirement. A PRD gap remains `Q-NN` plus `TODO(spec)` even when the
knowledgebase describes common behavior.

`spec-analysis.md` records the requirement authority and knowledge context
separately. Knowledge references are labeled
`Reference context only — not a requirement`; they never appear as requirement
sources. Observed implementation remains evidence only. Conflicts are
reported, and the provided requirement wins.

### P15 — Visual regression is explicitly designed and deterministically run

For every category selected in Case Forge, `20-cases/coverage-notes.md` records
either `Visual candidates: <TC ids or planned behaviors>` or
`Visual: N/A — <specific reason>`. Spec Probe risk dimensions and **Where to
check** entries are inputs to that decision. A cross-category deferral names
the target `CAT-NN` and exact rendering behavior. Case Audit treats a missing,
generic, or unsupported disposition as `high`.

A visual candidate becomes a dedicated `@visual @manual` scenario with a named
baseline and rendering-only expectation; it complements rather than replaces
data-layer proof. Script Forge preserves `@visual`, loads the active profile's
visual guidance, and adds `@automated` only after the named baseline,
deterministic environment, approved masks, comparison command, and evidence
contract are runnable. It never invents a host baseline workflow when the
profile requires a container or another controlled runner.

### P16 — Existing spec analysis changes are explicit and traceable

Spec Probe never silently overwrites a completed `spec-analysis.md`. The user
chooses one mutually exclusive mode:

- `--migrate-format` changes only AC presentation. It does not reread the
  source or change meaning, IDs, statuses, exact values, questions, categories,
  downstream stage statuses, or human signatures.
- `--reconcile` compares the existing analysis with a complete approved source.
  It preserves an ID only when the pass/fail meaning is unchanged. A material
  meaning change supersedes the old AC and receives a new AC ID.

Both modes write `10-spec/spec-reconciliation.md` with the old analysis hash,
source revisions, per-item classification, downstream impact, and validation
results. Format-only changes invalidate nothing. Added, removed, changed, or
superseded requirements are routed to `/update-cases`; Spec Probe does not edit
cases, scripts, external records, run evidence, or human signatures.

The feature ledger keeps an append-only Spec reconciliations table. Later gates
treat evidence that predates a substantive reconciliation as stale for the
named ACs until the routed amendment, audit, and review work is complete.

### P17 — Gates may be hibernated, never faked

A consumer repository may suspend the Design, Merge, and Ops Gates by declaring
`governance.gates` in `probe.config.yaml`. This exists so a team can run PROBE
end to end before agreeing to be bound by it: during an evaluation, a gate that
blocks delivery is an adoption barrier, and the usual outcome is that the team
abandons the process rather than the shipping.

**Hibernation suspends blocking and nothing else.** The gate still runs, still
assembles its evidence, and still reports `READY` or `NOT READY` with every
failing checklist item intact. Its decision line reads
`HIBERNATED — evidence assembled, not signed`. It is never `approved`,
`passed`, or `signed`; rendering it as one is falsified evidence and is
`blocker` under the ladder.

Five things are explicitly **not** suspended, and a skill that suspends any of
them has misread the policy: the severity ladder (a `blocker` still halts, and
wrong business data is still `blocker`), Case Audit and Script Audit verdicts,
the traceability chain, external-write authorization, and the repository's own
branch protection and merge controls, which PROBE does not own.

`mode: hibernated` requires a named `authorizedBy`, a `reason`, a `scope`, and a
`since` date. A hibernation with no named human is not a governance decision and
is rejected. Every stage that proceeds under it writes a ledger row carrying the
authorizer and the gate's real readiness verdict; when gates resume, those rows
**are** the gate-debt list, and each is then signed, explicitly bypassed, or
remediated. A gate that said `NOT READY` under hibernation does not become
`READY` because time passed.

Full contract: [gate-hibernation.md](../governance/gate-hibernation.md).

---

## 7. Artifact & naming conventions

- Feature slug: kebab-case (`wafer-map-cluster-overlay`).
- Working artifacts: `.probe/artifacts/<feature>/<NN-stage>/…` where stages
  are `10-spec, 15-implementation-probe, 20-cases, 30-case-audit, 40-ui-recon, 50-exploratory,
60-scripts, 70-script-audit, 80-green-run, 90-testops`, plus `bugs/` and
  `flakes/`. Gitignored in source control; CI archives `.probe/artifacts/**`
  before cleanup so run evidence remains triageable.
- Permanent trail (committed): `docs/qa/<feature>/LEDGER.md` and
  `docs/qa/<feature>/audit/gate-{design,merge,ops}.md`.
- Branches: `e2e/<feature-slug>`. Preserve a verified existing durable
  test-case id (for example `YWPD-TC-1202`) when importing an existing case;
  otherwise allocate `TC-<feature-slug>-NNN`. Never fabricate an external/AIO
  key. The matching `@<TC-id>` identity tag is permanent.
  Bugs: `BUG-NN`. Flakes: `FLAKE-NN`.
- Tags: suite (`@smoke`, `@regression`), domain (`@wafermap`, `@ruleengine`),
  quality (`@visual`, `@a11y`), lifecycle (`@manual`, `@automated`,
  `@quarantine`), Allure labels
  (`@epic:`, `@feature:`, `@story:`, `@severity:`), and a
  optional external-case labels defined by the configured case-management
  integration, and a traceability comment when such an external id exists.

---

## 8. Interfaces to external systems

- **Product knowledge** — configured per consumer. A required unavailable
  provider blocks domain-dependent work. The recommended YieldWerx provider is
  the public `yw:ask-yieldwerx` skill backed by the separately installed
  knowledgebase (an optional prerequisite, never a declared dependency; reached through `/ask-yieldwerx` to read and `/update-yieldwerx-knowledge` to record an approved change);
  artifacts record its version and source IDs.
- **Case management** — optional and configured per consumer. When required
  but unavailable, skills record `sync: pending` and gates surface it. The
  bundled AIO adapter uses AIO's REST API and stable write-backs; it is not a
  core dependency.
- **Browser/runtime connector** — required only for runtime Implementation
  Probe and UI Recon. Without a configured connector, runtime comparison is
  `blocked`; UI Recon is `blocked` or consciously `n/a` in the ledger—never
  fabricated. The Playwright MCP guidance is supplied by the Playwright BDD
  profile.
- **CI + report provider** — TestOps Promotion/Ops Gate require durable runs
  from the configured provider, fail-on-unexpected-flake behavior, and archive
  reports plus `.probe/artifacts/**` before cleanup. Local-as-CI runs are
  diagnostic unless the consumer's approved evidence policy says otherwise.
- **Issue sync** — candidate ingestion is untrusted input: schema-versioned
  JSON, candidate paths, attachment roots, symlinks, file type, and size are
  validated. The configured `syncBugs` command defaults to dry run. Filing requires
  provider configuration and explicit `--live`. Schema-v3 `evidenceReview` must approve
  the exact current paths; trace/HAR/ZIP requires a second sensitive-path
  approval and fresh evidence clears the review. Existing issues receive new
  approved evidence as well as a comment.
- **Live API/DB** — authentication roles propagate from storage state into API
  fixtures. Non-idempotent calls retry only with a stable backend-supported
  idempotency key, queue waits use the validated queue budget, live DB config
  must be complete, and every DB assertion correlates to the submitted run ID.
