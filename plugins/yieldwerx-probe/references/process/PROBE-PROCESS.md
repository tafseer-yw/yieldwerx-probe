# PROBE — Plan · Review · Observe · Build · Evaluate

**Test with purpose. Release with proof.**

PROBE is a portable operating model for QA delivery end to end: requirement
analysis, case design, manual and exploratory testing, traceability, optional
case-management synchronization, automation, and operational evidence.

The five words name the rhythm; the named stages are how it is executed:

| Word         | What it means                                     | Stages                                                                 |
| ------------ | ------------------------------------------------- | ---------------------------------------------------------------------- |
| **Plan**     | turn an idea into a requirement, then into designed, stored cases | Requirements Forge · Spec Probe · Case Forge · Case Sync               |
| **Review**   | a human reads the design before anyone builds on it | **Design Gate**                                                      |
| **Observe**  | look at the real application, not just the intent | Implementation Probe · UI Recon · Exploratory Run                      |
| **Build**    | implement the approved cases as automation        | Script Forge                                                           |
| **Evaluate** | prove it holds, then promote it                   | Stability Run · **Merge Gate** · TestOps · **Ops Gate**                |

It is a mnemonic for the activities, not a strict running order — Observe spans
both the early implementation comparison and the post-Design-Gate locator pass.
The name is also a wafer-test pun: in the fab, _probing_ touches and measures
every die before packaging ships anything downstream.

**Status:** v3.1 · Authority for all QA workflow governance in this repo.
The plugin `skills/` implement this process; where a skill and this document
disagree, this document wins and the skill gets fixed in the same PR. The
development track's authority is [DEV-TRACK.md](DEV-TRACK.md); the two tracks
now share one entry point, `/probe-spec`.

_v3.1 completes the two-track shape. The Dev track gains a front and a back:
`/forge-prd` writes a plain-language PRD every stakeholder reads the same way
(validated, not advised), `/forge-tech-design` turns the shared spec analysis
into a stack-fitted design, and `/forge-unit-tests`, `/forge-migration`,
`/sync-styleguide`, `/review-pr`, and `/handoff` fill the build-to-merge path.
One skill set targets many stacks by `--stack` reading a profile (dotnet-legacy,
dotnet-modern, node-ts-spa, testcomplete-winforms). Spec Probe is now shared:
one analysis, both tracks, whoever runs it second reads it. The QA track gains
desktop automation (`/desktop-recon`, `/forge-desktop-scripts` — TestComplete
BDD with Python steps), property-based API fuzzing, and OWASP Top 10:2025
security testing (`/forge-security-tests` for the categories a scanner cannot
judge, `/scan-security` for the ones it can, through a swappable tool contract)._

_v3.0 made every gate a record of a human decision and nothing else. Removed:
Case Audit as a stage, the computed READY/NOT READY verdict, blocking gate
checklists, gate hibernation, allrounder audit and gate bypasses, the PROBE Owner
PIN override, and the waiver system all five of those existed to argue with. A
gate now assembles an evidence digest of facts, a named human states their
decision, and it is recorded with a timestamp. Script Audit became the advisory
`/audit-scripts` review, which holds no ledger row and blocks nothing. Case Forge
designs API-level cases in every category. Spec Probe enforces plain language:
labels verbatim from the source, no invented acronyms, and a plain-words
explanation for every acceptance criterion._

_Earlier: v2.8 added API Recon, typed API Test Forge, and guarded k6 Performance
Test Forge; made API performance a QA-owned, repository-only test level and kept
API/contract/performance cases and results out of AIO. v2.7.1 renamed the PROBE
expansion to Plan · Review · Observe · Build · Evaluate. v2.4 made the provided
requirement package the sole requirement authority and limited knowledgebase use
to terminology and business context. v2.3 added safe format migration and source
reconciliation for existing spec analysis artifacts. v2.2 required a
`Verify that ...` summary and Given/When/Then for every Workflow and Simple Rule
acceptance criterion. v2.1 made visual candidacy explicit per category and
required deterministic visual scripting. v1.5 added simple Workflow and Simple
Rule acceptance criteria while keeping the AC index stable for traceability. v1.4
added the optional Implementation Probe. v1.3 made plain-language procedural
Gherkin and safe scoped cycles enforceable._

> **Why "PROBE":** wafer probing is literally how dies get tested — a probe
> card touches down on each die and measures it before the wafer ships. This
> process does the same to every feature: structured touchdowns (workflows),
> measured results (artifacts), and a ship/no-ship decision at each gate.

PROBE is the QA counterpart of a review-gated SDLC: no test scripting before a
human has approved the test design, no merge before a flake screen, no "Done"
before CI proves stability over time. It is sized for a small QA team (3–5
people) — a gate is an evidence digest a human reads in five minutes and a
decision that gets recorded, not a ceremony and not a computed verdict.

---

## 1. Team & authority (roles, not names)

PROBE assigns authority to **roles**. One person may hold more than one role — on
a 3-person team the same person often acts as both Domain Test Analyst and Manual
QA Engineer. What matters is that every approval maps to a named human, a role,
and a timestamp in the ledger.

| Role                    | Skill set                                                                                                                               | Authority                                                                                         |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| **QA Lead**             | Automation architecture, delivery stack, CI/CD, process ownership, severity arbitration                                                 | Approves any gate; owns the flake log                                                             |
| **Automation Engineer** | Scenario scripting, automation abstractions, specialized UI/data testing, flake triage, CI wiring                                        | Approves any gate                                                                                 |
| **Domain Test Analyst** | Deep YieldWerx domain: bin semantics, cluster/ink rules, notch conventions, policy versions, rule-engine behavior; test design & review | Approves any gate; the usual reader of the Design Gate digest; grows into scripting over time      |
| **Manual QA Engineer**  | Manual test-case design and execution, exploratory testing, bug reporting, evidence discipline                                           | Approves any gate; owns Case Forge drafting, `/execute-cases` batches, and Exploratory Run records |

**Any role may approve any gate.** The approving human is named in the ledger's
Gate approvals row, and their statement is the authorisation. There is no signer
hierarchy, no solo-approval exception, and no waiver — because there is nothing to
waive. A gate that has not been approved is simply not approved, and the
downstream stage stays locked until someone approves it.

The Domain Test Analyst is the *usual* reader of a Design Gate digest, because
domain correctness is what that digest is mostly about. That is a habit worth
keeping, not a rule the process enforces.

**Approval decisions are always human.** A gate orchestrator assembles facts and
records a decision; it never makes one. Claude may write the approval row on a
human's behalf after they state the decision, recording
`Recorded by: Claude — transcribed from the human's direct approval`. That is a
transcription, not an approval. Claude never writes an approval the human did not
state — not from a clean digest, not from an approval of a different scope, and
not because every check passed.

**Approving with known gaps is a real decision.** The digest lists every gap; the
human may approve anyway, and the row records what they said they reviewed. What
is forbidden is removing a gap from the digest to make the decision look cleaner —
that is falsified evidence and the most serious failure this process guards
against.

**Manual QA is a first-class track, not a fallback.** Approved cases are
executable by hand as soon as the Design Gate approval is recorded, and manual
execution results in Exploratory Run are gate evidence — they de-risk scripting and
catch application bugs before automation exists. A feature whose automation is
still in progress can ship on manual evidence when the release owner records that
decision in the ledger.

Full contract: [human-gates.md](../governance/human-gates.md).

---

## 2. The map

```
 DESIGN TRACK                  SCRIPTING TRACK                  OPS TRACK
 Spec Probe                    UI Recon (optional)              TestOps Promotion
 Implementation Probe
 (optional, before cases)
 Case Forge                    Script Forge                          │
     │                         Stability Run                         │
 ┌───▼────────┐  Exploratory Run ─┐  │                        ┌──────▼─────┐
 │ DESIGN     │─────────────────► │  │      ┌──────────────►  │ OPS        │
 │ GATE       │  (recorded any   ▼  ▼      │                  │ GATE       │
 └────────────┘  time before    ┌────────────┐                └────────────┘
  a human reads the digest      │ MERGE GATE │                 a human reads
  and records a decision        └────────────┘                 the digest
                                 a human reads                 = feature
                                 the digest                     automation DONE
```

Advisory, invoked when useful and never a gate: **/audit-scripts** (an
independent read of the automation branch, reported into the Merge Gate digest).

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
build on an approval the QA team owns would make the track unusable.

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

**No development skill approves, assembles, or substitutes for a gate.** A
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
| **Requirements Forge** _(shared: both tracks)_                      | `/forge-prd`            | Turn an idea or problem statement into a PRD every stakeholder reads the same way — problem and cost, product-word build description, stable `US-NN` stories each with a plain-words explanation, open questions with recommended answers, and a Terms table, all enforced by `validate-prd.mjs`. Lives in the configured PRDs home with a draft → in-review → signed-off filename lifecycle; sign-off is a recorded human decision. The signed-off PRD is the canonical source Spec Probe cites.                                                                                              | `<prds-path>/<slug>/prd-*.md`                                                |
| **Spec Probe** _(shared: both tracks)_                              | `/probe-spec`           | The shared entry point of the dev AND QA tracks — one analysis per feature, jointly owned; whoever runs it second reads the existing artifact, and a requirement change goes through `--reconcile`, which reports impact to both tracks. Ingest the provided PRD/story/spec as the sole requirement authority; use the knowledgebase only for terminology and business context; start every acceptance criterion with a `Verify that ...` summary; write both Workflow and Simple Rule criteria with `Given/When/Then`; keep a stable AC index; record unclear wording, open questions, test data, and where to check each result. `--migrate-format` updates presentation only; `--reconcile` compares an existing analysis with the complete approved requirement and reports downstream impact. Creates the ledger.                                                                                                                 | `10-spec/spec-analysis.md` + optional `spec-reconciliation.md` + `LEDGER.md` |
| **Implementation Probe** _(optional when a reachable build exists)_ | `/probe-implementation` | Compare each approved AC with an identified running build and classify it as aligned, divergent, not implemented, not observable, or blocked. Current behavior is evidence, never requirement truth; extra behavior is recorded as undocumented.                                                                                                                                                                                                                                                                                                                                                                                                                                              | `15-implementation-probe/implementation-comparison.md` + evidence            |
| **Case Forge**                                                      | `/forge-cases`          | Design the **QA-owned Gherkin feature files, one per testable category** (`CAT-NN`) for UI, service/API, security, consumer contract, and API-performance behavior, in business-readable procedural style, ordered easy→hard, typed, and permanently tagged `@manual`. Every category records an explicit visual disposition **and an explicit API disposition**. Optional selectors can append one scenario-type/category/AC slice without declaring the feature complete. Produce literal expected values, candidacy tiers, and the **developer-owned coverage hand-off** for ACs whose right level is unit or implementation-internal integration. Designs only; the AIO push is a separate stage (Case Sync). | `features/<slug>/*.feature` + `20-cases/`                                    |
| ↳ **Case amendment**                                                | `/update-cases`         | Amend an **existing** case set in place when an open question is answered, a review finding lands, the spec changes, or an expected value was wrong. Preserves TC ids and external keys, supersedes rather than deletes, and records what the change invalidates (an approved gate, a passing script, stale run evidence). Never regenerates a feature file.                                                                                                                                                                                                                                                                                                                                          | amended `features/<slug>/*.feature` + `20-cases/amendments/`                 |
| **Design Gate**                                                     | `/gate-design`          | Assembles Spec Probe, Case Forge, and optional Implementation Probe evidence into a digest of facts — counts, coverage numbers, lint results, and every gap — with no computed verdict. A named human states their decision; it is recorded with a timestamp and unlocks Case Sync and Script Forge.                                                                                                                                                                                                                                                                                                              | `docs/qa/<feature>/audit/gate-design.md`                                     |
| **Case Sync** _(optional case-management integration)_               | `/sync-cases`           | Push Design-Gate-approved Gherkin scenarios through the configured case-management adapter as durable records. Sync is idempotent, dry-run by default, and live-write gated on a recorded human approval for the exact scope.                                                                                                                                                                                                                                                                                                                                                                                     | `25-aio-sync/aio-sync.md` + external cases + traceability write-backs        |
| **UI Recon** _(optional when a live UI exists)_                      | `/ui-recon`             | Walk the exact Design-Gate-approved scope in the live app, harvest robust locators/screenshots, and flag observability or selector-contract gaps defined by the active profile.                                                                                                                                                                                                                                                                                                                                                                                                                                   | `40-ui-recon/`                                                               |
| **Assisted Case Execution** _(optional live UI companion)_          | `/execute-cases`        | Execute the exact approved Gherkin through one Playwright MCP browser batch, isolate independent cases, capture every step, and preserve a standardized evidence packet before retry or recovery. It never marks cases automated or syncs AIO results directly.                                                                                                                                                                                                                                                                                                                                                                                                                               | `50-exploratory/executions/`                                                 |
| **Exploratory Run**                                                 | `/log-exploratory`      | Consolidate exploratory charters and manual or assisted execution of the Design-Gate-approved scope, or a recorded decision not to execute them.                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `50-exploratory/`                                                            |
| **Security Case Forge** _(optional)_                                | `/forge-security-tests` | Author the OWASP Top 10:2025 categories a scanner cannot judge — access control, insecure design, authentication, logging — as `@testtype:security` `@owasp:ANN` scenarios against the requirement's own rules, with a coverage map reconciling every category to authored/scanned/N/A. Repository-only.                                                                                                                                                                                                                                                             | `<slug>/<category>-security.feature` + `20-cases/security-coverage.md`        |
| **Security Scan** _(optional)_                                      | `/scan-security`        | Drive the configured security toolchain (dependencies, SAST, DAST, API fuzzing) through a swappable adapter, map findings to OWASP categories and the severity ladder, triage confirmed from noise, and route confirmed findings to `/bug-report`. Active scans require explicit target authorization and refuse closed without it.                                                                                                                                                                                                                                | `75-security/security-scan.md`                                               |
| **Desktop Recon** _(optional when the WinForms app is in scope)_    | `/desktop-recon`        | Walk the approved desktop scope in a reachable build, harvest Name Mapping candidates per the identity ladder, and report every control without a developer-set Name as a testability gap routed to the dev track.                                                                                                                                                                                                                                                                                                                                                                              | `40-desktop-recon/`                                                          |
| **Desktop Script Forge**                                            | `/forge-desktop-scripts` | Import the approved `@desktop`-tagged scenarios unchanged into TestComplete's Scenarios item, bind Python step definitions, map objects through Name Mapping aliases, run the tagged slice, and add `@automated` only after a real run. Refuses without a recorded human Design Gate approval, exactly as Script Forge does.                                                                                                                                                                                                                                                                     | TestComplete project + `60-scripts/desktop-forge-notes.md`                    |
| **Script Forge**                                                    | `/forge-scripts`        | Implement the approved `@auto:now` Gherkin without re-authoring it; optional selectors constrain an automation cycle to scenario type/category/AC/TC. For `@visual`, use the active profile's named baseline, approved masks, deterministic runner, and comparison evidence. Add `@automated` when runnable. **Refuses without a recorded human Design Gate approval.**                                                                                                                                                                                                                                            | branch + `60-scripts/forge-notes.md` + optional `oracle-design.md`           |
| **API Test Forge** *(optional)*                                     | `/forge-api-tests`      | Implement typed clients, request/response schemas, and contract, integration and interception tests against the reconciled API inventory. Runs alongside Script Forge on the same Design Gate authorization; it never substitutes for UI scenario coverage. | branch + `60-scripts/api-test-notes.md`                                      |
| **Performance Test Forge** *(optional)*                             | `/forge-performance-tests` | Implement guarded k6 smoke, load, spike, stress or endurance workloads with explicit thresholds and a named target environment. Never aimed at production without a recorded human authorization. | branch + `60-scripts/performance-notes.md`                                   |
| **Script Review** _(advisory, never a gate)_                        | `/audit-scripts`        | An independent read-only review of the automation branch: self-passing tests, missing independent truth, brittle locators, unsafe retries, traceability breaks. Holds no ledger row and blocks nothing; its findings are reported into the Merge Gate digest for a human to weigh.                                                                                                                                                                                                                                                                                                                                | `70-script-audit/script-audit.md`                                            |
| **Stability Run**                                                   | `/green-run`            | Execute until **green ×3 consecutive** with every run recorded and every failure diagnosed and classified. Any fix restarts the streak, because the streak proves the determinism of exactly what ran.                                                                                                                                                                                                                                                                                                                                                                                                            | `80-green-run/green-run.md`                                                  |
| **Merge Gate**                                                      | `/gate-merge`           | Assembles Script Forge, Stability Run, coverage, observability, and any advisory review evidence into a digest of facts. A named human states their decision and it is recorded with a timestamp. The approval is a QA decision — it never merges the branch or satisfies branch protection.                                                                                                                                                                                                                                                                                                                       | `docs/qa/<feature>/audit/gate-merge.md`                                      |
| **TestOps Promotion**                                               | `/testops-promote`      | After a recorded human Merge Gate approval and an actual authorized merge, wire CI execution, slicing, fail-on-flake behavior, reporting, durable evidence, and budgets.                                                                                                                                                                                                                                                                                                                                                                                                                                          | `90-testops/testops.md`                                                      |
| **Ops Gate**                                                        | `/gate-ops`             | Assembles real CI history, flake rate, report history, external sync state, coverage rungs, and the manual-only inventory into a digest of facts. A named human states their decision; a recorded approval is what marks the feature's automation **Done**.                                                                                                                                                                                                                                                                                                                                                        | `docs/qa/<feature>/audit/gate-ops.md`                                        |

### Legacy code mapping (historical references only)

Old artifacts may use these retired labels. Do not use them in new ledgers or instructions:
`W1` = Spec Probe, `W2` = Case Forge, `W3` = a retired Case Audit stage,
`G1` = Design Gate,
`W4` = UI Recon, `W5` = Exploratory Run, `W6` = Script Forge, `W7` = Script
Audit, `W8` = Stability Run, `G2` = Merge Gate, `W9` = TestOps Promotion,
and `G3` = Ops Gate.

**Ordering rules.** Spec Probe → Case Forge → Design Gate is the default.
Implementation Probe may run between Spec Probe and Case Forge when a reachable
build exists. If explicitly requested, it must finish, be blocked with a recorded
reason, or be skipped with a human record before Case Forge; an untouched
`pending — optional` row does not block design.

Case Sync runs after a Design Gate approval is recorded, because only
human-authorized cases reach an external case-management system, and re-runs
whenever scenarios change; a dry-run may be reviewed earlier. UI Recon and
Exploratory Run occur after the Design Gate and before the Merge Gate; UI Recon
precedes Script Forge whenever an environment exists.

Script Forge → Stability Run → Merge Gate is the default. `/audit-scripts` is
advisory and may be run at any point in that sequence, or not at all; it never
gates the next step. TestOps Promotion → Ops Gate is the default, and TestOps
Promotion additionally requires the branch to be actually merged through the
repository's own controls.

Rework loops are normal and stay visible in the ledger.

**Scoped-cycle rule.** Case Forge, Script Forge, `/audit-scripts`, and Stability
Run accept `--scenario-type`, `--category`, `--ac`, and—after case
allocation—`--tc` where applicable. Selectors intersect; unknown or zero-match
selectors fail closed. A scoped cycle records exact TC ids and never marks the
feature-level stage done. A gate digest states plainly which evidence is
feature-level and which is a subset, so the human approving it knows what they are
approving.

**Amendments are not a rework loop.** Once a category's cases exist, changes go
through `/update-cases`, not a second `/forge-cases` run — re-forging renumbers TC
ids and orphans the external records bound to them. An amendment may land at
**any** point in the lifecycle, including after a gate is approved, so it must
declare what it invalidates: an `expected-value`, `structural`, or `scope`
amendment invalidates the Design Gate approval for the cases it touched, breaks any
script bound to them, and makes prior run evidence stale. Those invalidations are
recorded in the ledger's **Case amendments** table. The affected gate then needs a
fresh decision and a new approval row; nothing is recomputed and no earlier row is
edited.

---

## 4. The feature ledger

Every feature gets `docs/qa/<feature-slug>/LEDGER.md` — created by
`/probe-spec` from its embedded template, committed, and updated by every
workflow. It is the single glance-view of where a feature stands:

- the named-stage status table
  (`pending · in-progress · done · blocked · n/a`);
- the **Gate approvals** table — one appended row per human decision, carrying the
  gate, scope, name, role, timestamp, what they confirmed, and the evidence link;
- the per-category Design Gate approvals table, for categories approved and synced
  independently;
- the Spec reconciliations and Case amendments tables;
- links to every artifact and bug/flake record.

**The three GATE rows are the only rows that need a human decision.** Every other
row is progress tracking. Advisory work — `/audit-scripts`, validators, lint, the
coverage report — has no row at all; its result appears in the relevant gate
digest. There is no waiver table, because nothing in the process can be waived:
a gate is either approved or it is not.

If the ledger and reality disagree, fixing the ledger is part of the work — the
next gate digest reads the ledger, and a stale one produces a digest that
misleads the human approving it.

---

## 5. Severity ladder (shared vocabulary, not control flow)

| Severity  | Meaning                                                                                                                                               | What it means for the work                                                          |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `blocker` | Wrong data shown to users, self-passing test, falsified evidence, unverifiable chart numbers                                                            | Fix it, or state it in the gate digest's **Gaps** section in plain terms             |
| `high`    | Broken policy: raw CSS/XPath, hard wait, missing render sync, single-layer critical scenario, traceability break, missing negative coverage, infeasible data | Fix it, or record it in **Gaps** — a human decides whether to approve past it        |
| `medium`  | Convention drift: fat steps, assertions in page objects, tag/label mistakes, vague expectations                                                         | Recorded; worth fixing while the code is warm                                        |
| `low`     | Style, naming, minor doc gaps                                                                                                                          | Recorded                                                                             |
| `info`    | Observations, improvement ideas                                                                                                                        | Recorded                                                                             |

Severity is **classification, not control flow.** Nothing in PROBE halts
automatically on a severity. The ladder gives everyone the same words for how bad
something is — in `/audit-scripts` findings, bug reports, flake triage, and code
review — so a gate digest can state a problem's weight and a human can decide what
it is worth. A `blocker` that a human knowingly approves past is a recorded
decision; a `blocker` quietly dropped from the digest is falsified evidence.

**Wrong-data findings on wafer maps are always `blocker`** — a chart that
contradicts the numerical oracle or the database is never "minor", whatever
the delta. Yield numbers are the product; showing wrong ones quietly is the
worst failure mode this process exists to catch.

---

## 6. Standing policies

### P1 — Selector and observability policy

Every interactive or assertable surface needs a stable automation contract.
The consumer profile defines the selector order, prohibited techniques, and which
missing hooks the Merge Gate digest must report. `/audit-scripts` applies that
declared contract; it does not invent framework rules.

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
rationale. A critical result supported only by its own displayed or returned
value is a `high` finding; a self-derived expected value is a `blocker`.

### P3 — Traceability

Spec acceptance criterion → external test case id → tagged scenario. Any break in
that chain is a `high` finding. A scenario that exists in no approved case is a
finding, not initiative.

### P4 — No scripting before the Design Gate

`/forge-scripts` reads the ledger's **Gate approvals** table and **refuses** until
a Design Gate row names a human, a role, and a timestamp for the scope being
scripted. That is the whole check: no audit verdict, no hash comparison, no waiver
lookup. Claude may have written the row on the human's behalf after they stated the
decision; what it may never do is write a row nobody stated.

This is the one place PROBE genuinely blocks, and it blocks on exactly one thing —
whether a human has looked at the design. It exists so Claude cannot quietly decide
that unreviewed cases are safe to automate.

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
   stages: spec analysis, case design, script review, oracle design,
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
testing (Exploratory Run) until the feature stabilizes. The designer recommends; the
human approving the Design Gate decides. A wrong-data-risk scenario parked
`@auto:later` is a Design Gate digest
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

Every manual-only scenario carries a disposition: `manual-permanent`,
`deferred-until:<condition/date>`, or `retired`, each with an exact `TC-*` id,
rationale, owner, and any expiry or backfill date. The Ops Gate digest lists the
manual-only inventory with each disposition, and names every scenario that has
none — a generic percentage or an open-ended "we'll get to it" is not a
disposition, and the digest says so rather than accepting it.

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
deterministic portion of this policy; a human reading the digest judges the remaining
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
Script Forge applies a selector only after calculating the approved `@auto:now`
set, so the work set is requested scope ∩ human-authorized scope ∩ manual-only.
An advisory review and a Stability Run must state the exact TC inventory and
commit/hash they covered. Subset evidence is useful iteration evidence; the gate
digest says so plainly, so the human approving it knows what the subset was.

### P12 — Intended and observed behavior stay separate

Implementation Probe compares `10-spec/spec-analysis.md` with a running,
identified build. Its results are `aligned`, `divergent`, `not-implemented`,
`not-observable`, or `blocked`; behavior outside the approved AC inventory is
`undocumented`. It never edits an AC, resolves an ambiguity, or treats the
application as the oracle for its own expected result.

Case Forge continues to design from approved intent. A confirmed mismatch is a
known expected failure and can become a `/bug-report` candidate, but the skill
does not file it automatically. A mismatch does not invalidate sound test design. The Design Gate digest reports
the comparison when it ran, and an unresolved question that controls an expected
behavior appears in its **Gaps** section. Merge and Ops digests list unresolved
application defects the same way. UI Recon remains a later, separate activity for
locator and `data-testid` discovery.

### P13 — Acceptance criteria use simple QA language

Spec Probe classifies each AC, but both formats use the same readable shape:

- **Workflow:** use `Given`, `When`, and `Then` when a user or system action
  causes a result or state change.
- **Simple Rule:** also use `Given`, `When`, and `Then` for a layout, limit,
  allowed value, data rule, calculation, or measurable non-functional rule.
  Use the smallest context and action supported by the source. Every
  `Then`/`And` result uses `must` or `must not`.

Every AC starts with `**Summary:** Verify that ...` — one sentence of twenty words
or fewer — followed by `**In plain words:**`, one to three sentences explaining the
criterion to a competent reader with **no domain knowledge**, before its fenced
Gherkin block. Do not invent a click or screen just to make a Simple Rule fit
Gherkin.

**Three lexical rules are enforced, not advised.** They were prose for four minor
versions and drifted every time, so `validate-spec-analysis.mjs` now rejects each:

1. **Labels are verbatim.** Every control, screen, field, tab, button, status,
   message, and product term is written exactly as the provided requirement writes
   it — same words, same capitalisation, same spacing. The source's
   `Cluster Detection Mode` is never `cluster mode` and never `CDM`. An
   inconsistent label in the source is an `AMB-NN`, not a licence to choose.
2. **No invented acronyms.** An acronym may appear only if the provided
   requirement itself uses it and a `## Terms` row cites where. Process ids, units,
   and file formats are exempt by a fixed list. `## Terms` is therefore a required
   section: it is simultaneously the reader's glossary and the allowlist.
3. **No abbreviations.** `configuration`, not `config`; `message`, not `msg`;
   `parameter`, not `param` — in summaries, plain-words lines, and Gherkin steps
   alike.

The AC describes the required result, not the detailed manual test. Case Forge
later adds visible, step-by-step actions and the positive, negative, and edge
coverage. Each active AC keeps one stable `AC-NN`, one index row, and one
definition. Use short product words, exact values, and results a QA can see or
measure. Do not use vague words such as "fast", "properly", "correctly", or
"user-friendly", and do not use implementation words unless the approved
requirement is specifically about that technical item.

Plain language applies to prose and never to a value: a threshold, bin number,
tolerance, or rounding rule is written precisely or not at all.

Full contract, with the exemption lists and worked examples:
[plain-language.md](../../skills/probe-spec/references/plain-language.md).

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
the target `CAT-NN` and exact rendering behavior. The Design Gate digest reports a
missing,
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
  downstream stage statuses, or human approvals.
- `--reconcile` compares the existing analysis with a complete approved source.
  It preserves an ID only when the pass/fail meaning is unchanged. A material
  meaning change supersedes the old AC and receives a new AC ID.

Both modes write `10-spec/spec-reconciliation.md` with the old analysis hash,
source revisions, per-item classification, downstream impact, and validation
results. Format-only changes invalidate nothing. Added, removed, changed, or
superseded requirements are routed to `/update-cases`; Spec Probe does not edit
cases, scripts, external records, run evidence, or human approvals.

The feature ledger keeps an append-only Spec reconciliations table. Later gates
treat evidence that predates a substantive reconciliation as stale for the
named ACs until the routed amendment, audit, and review work is complete.

---

## 7. Artifact & naming conventions

- Feature slug: kebab-case (`wafer-map-cluster-overlay`).
- Working artifacts: `.probe/artifacts/<feature>/<NN-stage>/…` where stages
  are `10-spec, 15-implementation-probe, 20-cases, 25-aio-sync, 40-ui-recon,
50-exploratory, 60-scripts, 70-script-audit, 80-green-run, 90-testops`, plus `bugs/` and
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
  but unavailable, skills record `sync: pending` and the gate digest reports it.
  Case Sync is defined against six verbs — `check · explore · plan · authorize ·
  push · write back` — not against a shell command, because a host may run
  processes without giving the assistant a shell. Three engines implement them:
  the CLI, the bundled stdio MCP server, and an export bundle when neither is
  available. `plan` is always free and writes nothing; `push` requires both an
  explicit live instruction and a recorded human approval for the exact scope. An
  engine is never selected silently, and an export bundle is never recorded as a
  completed sync. Authority:
  [case-management.md](../integrations/case-management.md).
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
