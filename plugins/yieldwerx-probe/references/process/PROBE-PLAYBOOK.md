# PROBE Playbook — step-by-step with copy-paste prompts

This is the hands-on companion to [PROBE-PROCESS.md](PROBE-PROCESS.md)
(authority) and [PROBE-QUICKREF.md](PROBE-QUICKREF.md) (one-page card). It
walks a QA person — including someone brand new to the team — through
designing a test case, getting it reviewed, scripting it, and executing it,
with a **ready-to-paste prompt for every step**. Open Claude Code in this
consumer repository, paste the prompt, replace the `<placeholders>`, press
Enter.

**Placeholders used below**

| Placeholder      | Meaning                                                 | Example                                    |
| ---------------- | ------------------------------------------------------- | ------------------------------------------ |
| `<feature-slug>` | kebab-case feature name (becomes folder + branch names) | `wafer-map-cluster-detection`              |
| `<spec-path>`    | path or URL to the PRD/story/spec                       | `docs/PRDs/wafer-map-cluster-detection.md` |
| `<env>`          | environment name from `config/environments/`            | `local`                                    |

`<spec-path>` does not imply that production PRDs must live in this repo. It
may point to a pinned export or an accessible external source. Record the
requirement ID, source repository/system, revision, and retrieval evidence
before Spec Probe. See [External requirement sources](../governance/requirements-sources.md).

**Two ways to trigger any workflow.** The slash command is canonical; the
plain-English sentence does the same thing if you prefer typing prose —
Claude Code resolves both to the same skill.

**A running example.** Every stage below carries an illustrative example from
the `wafer-map-cluster-detection` feature. Its paths show the default consumer
layout; the example's product files are intentionally not bundled with this
process repository. Examples show what each step looks like — they are not a
claim that a gate is signed.

---

## Stage 0 — before you start

You need the plugin installed, a consumer repository with `probe.config.yaml`,
and the spec (PRD, user story, or even a paragraph from product). If the spec
is a ticket, use the configured connector or place an approved, pinned export
under the consumer's configured requirements location so the analysis has a
stable input to cite.

For a spec owned in another repository or system, use a pinned revision or
approved export and record its provenance. The external source is a design-time
dependency only; normal Playwright/Jenkins execution must remain independent
of its availability.

---

## Stage 1 — Spec Probe · any role

```
/probe-spec <feature-slug> <spec-path>
```

Plain-English alternative:

> Run the PROBE spec probe for feature `<feature-slug>` using the spec at
> `<spec-path>`. Start each acceptance criterion with a `Verify that ...`
> summary. Write both Workflow and Simple Rule criteria with Given/When/Then,
> record unclear wording and open questions, and create the feature ledger.

**You get:** `.probe/artifacts/<feature-slug>/10-spec/spec-analysis.md`
(an AC index plus one Workflow or Simple Rule definition per active `AC-NN`,
**testable categories `CAT-NN`**, unclear wording, open questions, and test
data needed) and the ledger at
`docs/qa/<feature-slug>/LEDGER.md`. The categories are the units Case Forge turns into
one Gherkin feature file each. This digest is the single downstream source —
later stages read it, not the raw PRD (token policy P7).

Use Workflow when an action causes a result. Use Simple Rule for a layout,
limit, allowed value, data rule, calculation, or measurable performance rule.
Both use Given/When/Then. Simple Rule results use `must` or `must not`. Keep
both formats short and use words a QA sees in the product. Case Forge writes
the detailed procedural test cases later.

The provided PRD/story/spec is the sole requirement source of truth.
Knowledgebase chapters may explain YieldWerx words and business context, but
they cannot add or complete a requirement. Every AC, ambiguity, and out-of-scope
source cites the provided document. Missing PRD behavior remains a question.

If the analysis already exists, choose one explicit mode:

```text
/probe-spec <feature-slug> --migrate-format
/probe-spec <feature-slug> <complete-approved-spec> --reconcile
```

`--migrate-format` only converts the AC presentation and invalidates nothing.
`--reconcile` compares the old analysis with the approved source, preserves
IDs whose meaning is unchanged, and writes
`10-spec/spec-reconciliation.md`. Material changes are routed to
`/update-cases`; Spec Probe does not rewrite existing cases.

**Before moving on:** take the open-questions list to product/dev and the
Domain Test Analyst. Answer them in writing (append to the spec or the
analysis). Unanswered ambiguity becomes wrong test cases.

> **Example:** Spec Probe extracted **AC-01…AC-06** (yield tiles, pass/fail chart,
> die-level correctness, cluster inking, wafer switch, notch) and flagged the
> four ambiguities the PRD left open — _"adjacent" = 4- vs 8-connectivity_,
> _unstated minimum cluster size_, _yield decimal precision_, _is the pass
> bin always HB1?_ Those four became the open questions to resolve before
> design (answered: 4-connectivity, min size 3, 2-decimal yield, pass = HB1).

## Stage 2 — Implementation Probe · optional when an application is reachable

Run this after Spec Probe when a local or shared test build is available:

```
/probe-implementation <feature-slug> <env-or-url> --role <role> --build <id>
```

Or request the comparison as part of the Spec Probe command:

```
/probe-spec <feature-slug> <spec-path> --compare-implementation <env-or-url> --role <role> --build <id>
```

> Compare the approved requirements for `<feature-slug>` with the identified
> running build. Record evidence for every observable AC and keep intended
> behavior separate from current behavior.

**You get:**
`.probe/artifacts/<feature-slug>/15-implementation-probe/implementation-comparison.md`
plus redacted evidence. Each AC is `aligned`, `divergent`,
`not-implemented`, `not-observable`, or `blocked`; behavior outside the ACs is
recorded as `undocumented`.

This stage never changes an AC because the application behaves differently.
Case Forge still designs the approved intent and labels a mismatch as a known
expected failure. An unclear expected result goes back to a human as an open
question. The stage is optional unless explicitly requested. If requested but
the build, browser tooling, role, or data is unavailable, record it as
`blocked` instead of guessing.

Implementation Probe is not UI Recon. This stage checks **what the build
does** against the requirements before case design. UI Recon later checks
**how approved cases can be automated**, including locators and
`data-testid` gaps.

## Stage 3 — Case Forge · Manual QA Engineer

```
/forge-cases <feature-slug>
/forge-cases <feature-slug> --scenario-type functional
/forge-cases functional
```

> Design the manual test cases for `<feature-slug>` from its spec analysis:
> preconditions, atomic steps, expected results, priority, and AC
> traceability. Case Forge designs only — the push to Jira AIO Tests is a
> separate stage (`/sync-cases`, after the Design Gate).

The first command designs the full applicable QA set. The second designs only
the `@functional` slice and records Case Forge as `in-progress — partial`.
The one-word form is the same scoped command when exactly one active feature is
unambiguous; otherwise provide the slug.
Selectors may also use `--category CAT-NN` or `--ac AC-NN`; they intersect and
fail closed when nothing matches. A scoped run appends new cases, never edits
existing ones, and cannot make the Design Gate ready.

**You get:** **Gherkin feature files** at `features/<feature-slug>/<category>.feature`
(one per `CAT-NN`, every scenario `@manual`, ordered easy→hard, typed
`@positive/@functional/@negative/@edge`), plus `20-cases/case-details.md`
(literal expected numbers per scenario) and `20-cases/automation-plan.md`
(effort points + `@auto:now|next|later` candidacy + suggested pace), plus
`20-cases/coverage-notes.md`. Every selected category records either
`Visual candidates: <TC ids or planned behaviors>` or
`Visual: N/A — <specific reason>`. A cross-category deferral names its target
`CAT-NN` and exact rendering behavior.
Each scenario traces to an `AC-NN` with its AIO id left as `AIO-pending` until
Case Sync runs. `@manual` is permanent design provenance. At this stage the
scenarios are manual-only because they do not yet carry `@automated`; `bddgen`
selects only `@automated` scenarios.

The feature files use the team's manual-procedural language: an objective under
the title, then visible actions such as `Open`, `Click`, `Select`, `Enter`,
`Wait until`, and `Verify`. Exact labels and values belong in the steps or
Examples. Technical words such as oracle, fixture, locator, testId, DOM,
render synchronization, seeded mock, and page object stay in case details and
automation code. Validate with:

Run the consumer's configured `lintCases` command for `<feature-slug>`.

**Before moving on:** read every case yourself and ask: could I execute this
by hand tomorrow, with data I can actually produce? Hand the set to the
Domain Test Analyst for a domain-correctness pass (bin semantics, cluster
rules, notch orientation).

> **Example:** `YWPD-TC-1202` → open Bin Pareto → select the named Favorite,
> Group By, Bin Type, and chart options → click Execute → verify the named
> Gallery View chart. The fixture/oracle implementation stays outside the
> feature steps. Its AIO id stays pending until Case Sync pushes it.

## Stage 4 — Case Audit · runs itself

```
/audit-cases <feature-slug>
```

> Run the adversarial test-case audit for `<feature-slug>` — attack
> coverage, traceability, atomicity, negative and boundary depth, and data
> feasibility.

**You get:** `30-case-audit/case-audit.md` with severity-ranked findings and
an overall PASS/FAIL.

**If FAIL:** use `/update-cases` to amend existing cases in place. Use
`/forge-cases` only when the finding requires a genuinely new scenario, then
re-audit. Rework history stays visible in the ledger.

**Allrounder bypass:** a named QA Lead or Automation Engineer may explicitly
say `bypass Case Audit` for the whole feature or one category. Claude does not
delete or soften the audit. It marks the exact scope waived and records the
reason, known findings or missing review, residual risk, identity, role, date,
and direct-session authorization. A bare `approved` does not imply this
bypass.

> **Example:** the first Case Audit returned **FAIL** with five findings —
> untested 4-connectivity boundary, ATDF ingest uncovered, a missing
> queue-failure negative case, a circular mock-DB check, and a phantom DB
> layer in one case. Rework → audit #2 **PASS** with every pinned number
> arithmetically verified. The read-only auditor could not "fix" its way to
> agreement — that is why the PASS means something.

## Stage 5 — Design Gate · approved by a human

```
/gate-design <feature-slug>
```

> Assemble the Design Gate evidence report for `<feature-slug>`.

**You get:** `docs/qa/<feature-slug>/audit/gate-design.md` with an approval
block and a ready/not-ready decision.

**To sign:** the Domain Test Analyst reads the report, **confirms the
`@auto:now` automation set** (editing the recommendation if they disagree — the
human decision policy P8 requires), records it in the ledger, then edits the
ledger's Design Gate block
(`Approved by: <name> · Role: Domain Test Analyst · Date: <date> · Decision: approved`)
and the gate report, and
commits.

**Allrounder shortcut:** when the report is `READY`, a named QA Lead or
Automation Engineer may simply tell Claude `approved`. Claude then writes the
human's name, role, approval, current date, confirmed `@auto:now` set, Design
Gate `done` status, and the standard solo-allrounder waiver into both files.
The allrounder does not need to edit or date anything. This is transcription
of a human decision, not Claude approving its own work.

If Case Audit is the only blocker, the allrounder may say
`bypass Case Audit and approve`; Claude records a separate audit waiver and
residual risk before approving. Other blockers stay open.

**Design Gate bypass:** a named QA Lead or Automation Engineer may instead say
`bypass Design Gate` even when the report is `NOT READY`. Claude keeps that
readiness and every failed/missing check visible, records
`Decision: bypassed` and `waived — allrounder gate bypass`, and carries the
current proposed `@auto:now` set unless the allrounder narrows it. This is not
approval and does not silently bypass Case Audit.

**PROBE Owner override:** Tafseer Haider
(`tafseer.haider@yieldwerx.com`) may waive any exact PROBE item after creating a
short-lived PIN-authorized receipt with `probe owner-bypass authorize`. Tafseer
enters the PIN only in the hidden local terminal prompt and gives Claude only
the receipt path. Claude verifies the scope, records the authorization ID and
risk, applies that exact bypass, and consumes the receipt.

`/forge-scripts` will automate only the confirmed or bypass-recorded
`@auto:now` scenarios.

> **No scripting before a Design Gate decision.** `/forge-scripts` checks the
> ledger and refuses while Design Gate has neither recorded human approval nor
> an exact allrounder gate bypass.

> **Example:** the Design Gate report is stamped **READY**. The QA Lead says
> `approved`. Claude records the QA Lead's known name and role, today's date,
> the approved `@auto:now` set, and the waiver, then marks Design Gate `done`.
> If the speaker is not a known allrounder, the approval block stays empty.

## Stage 6 — Case Sync (AIO Tests) · Manual QA / Automation Engineer

Run the consumer's configured `syncCases` command first in its default dry-run
mode. After human approval, repeat it with the explicit `--live` flag.

> Push the approved Gherkin scenarios to Jira AIO Tests as durable BDD test
> cases. AIO Tests has its own REST API (not the Atlassian MCP), so this is a
> config-driven REST sync like `bug:sync`. Decoupled from Case Forge on purpose.

**You get:** one AIO case per scenario (Script Type BDD/Gherkin) in the
configured folder, linked to the feature's Jira requirement, with the returned
AIO key **written back** into each `# Traceability:` comment (replacing
`AIO-pending`). The plan is recorded at `25-aio-sync/aio-sync.md`.

**Before moving on:** run the dry-run first and review the plan (create vs
update, folder, requirement link, tags). The first live push should validate a
single scenario against the AIO Swagger before the bulk run. Secrets
(`AIO_API_TOKEN`) live in the environment only; `--live` fails closed on
partial config or a Design Gate without recorded approval, and re-runs update in place
(idempotent — matched by the written-back AIO key). Review the feature-file
write-backs (`git diff features/`) before committing.

> **Example:** a dry-run of `wafer-map-cluster-detection` planned **19 creates**
> into `…/wafer-map-cluster-detection/QA`, flagged the requirement as unmapped
> (set `requirementMap` in `config/aio-sync.json`), and — with no token and an
> Design Gate without recorded approval — refused `--live` with both reasons, exactly as
> designed.

## Stage 7 — Exploratory Run · Manual QA Engineer

The cases are now approved — they are executable by hand immediately, and
manual results are real gate evidence.

For Playwright MCP-assisted execution, keep one browser connection open for a
controlled batch while isolating each independent case:

```
/execute-cases <feature-slug> <env>
/execute-cases <feature-slug> <env> --tc <TC-id,TC-id> --continue-on-failure
```

When UI Recon and API Recon are also needed, make UI Recon the only browser
driver and register both companions before the first action:

```
/ui-recon <feature-slug> <env> \
  --with-api-recon --spec <openapi-path-or-url> \
  --with-case-execution --tc <TC-id,TC-id> --role <role>
```

One action may populate three artifact sets, but ownership remains separate:
`40-ui-recon`, `40-api-recon`, and `50-exploratory/executions`.

The skill executes every approved Gherkin step, writes step-level evidence to
`50-exploratory/executions/`, and captures the failure-point screenshot,
browser errors, sanitized network evidence, and configured application logs
before any retry or cleanup. It reuses same-role authentication only when safe;
it never reuses a previous case's result as a precondition. It does not add
`@automated` or sync results to AIO.

```
/log-exploratory <feature-slug>
```

> Record human-execution evidence for `<feature-slug>`: exploratory session
> charters and findings, and per-case manual run results (case id,
> pass/fail, build, environment). If we consciously skipped, record that.

**You get:** optional `50-exploratory/executions/` assisted-run evidence plus
`50-exploratory/exploratory-status.md` and `50-exploratory/manual-run.md`; AIO
status sync remains a separate explicitly authorized action.

> **Example:** a `manual-run.md` row — `TC-…-004 · pass · build local · env
local · executed by <name>` — plus an exploratory charter ("probe
> re-upload with a mismatched rows/cols header"). No environment time before
> release? An honest `skipped — risk accepted by <name>` is a valid, signable
> entry; a fabricated session is falsified evidence (`blocker`).

**Found a defect?** File it immediately (any stage, any role):

```
/bug-report
```

> File a bug: while testing `<feature-slug>` on `<env>`, I did <steps> and
> observed <actual>; expected <expected>. Evidence: <trace/screenshot/csv>.

Wrong wafer numbers (chart disagreeing with the input file, the oracle, or
the DB) are severity `blocker` — say so in the report.

**Automation-caught failures arrive pre-packaged.** Every final unexpected
failure and retry-then-pass flake is auto-collected as a schema-v3 candidate in
`.probe/artifacts/bug-sync/candidates/<fingerprint>.json` (scenario, failing
step, error, copied evidence paths, env, commit). `/bug-report` classifies it
and records exact `evidenceReview`; trace/HAR/ZIP paths require a second
sensitive-evidence approval. Fresh evidence invalidates an earlier review.
Then run configured `syncBugs` in its default preview mode and, only after
human authorization, repeat it with its explicit `--live` flag.

The first command is always a contained dry run. The second requires complete
HTTPS `JIRA_*` configuration and writes to Jira, fingerprint-deduped; a
re-failure comments and attaches newly approved evidence to the open issue.
Real captured example:

```
Jira bug sync — 1 candidate(s), 1 classified app-bug

  would create: [E2E] The summary tiles show the correct yield numbers — Then the summary panel reports the oracle yield
    priority: Highest · labels: e2e-auto, fp-3f0f9363394b, found-automated, demo, smoke, regression, wafermap, ...
    dedup key: fp-3f0f9363394b (open issue with this label → comment, not duplicate)
```

Unclassified candidates are held, never filed — raw-failure auto-filing is
the anti-pattern this design exists to avoid. Full walkthrough (plant a bug
in the demo app → candidate → classify → file → restore):
[docs/bug-lifecycle.md](../profiles/playwright-bdd/docs/bug-lifecycle.md).

## Stage 8 — UI Recon (optional but recommended) · any role

Only when a UI environment is reachable:

```
/ui-recon <feature-slug> <env>
```

> Drive the live app for `<feature-slug>` on `<env>`: walk each approved
> case, harvest locators, screenshot states, and flag every interactive
> element that lacks a data-testid.

**You get:** `40-ui-recon/` (recon log, locator inventory, testId gap list —
gaps become dev tickets). Scripting from harvested locators beats guessing.

> **Example (real, from this repo):** invoking
> `/ui-recon wafer-map-cluster-detection local` ran the precondition check and
> **stopped** — env ✅ (`demo-app/wafer-viewer`, `localViewer: true`) and
> Playwright MCP ✅, but the **Design Gate has no recorded approval**. Recon walks
> _approved_ cases, so it refused to proceed on an unsigned gate — the
> ordering rule visible in action. Sign the Design Gate and the same command runs the live
> browser walk, harvesting the locator inventory and flagging any chart
> container missing a `data-testid` (severity `high`).

## Stage 9 — Script Forge · Automation Engineer

```
/forge-scripts <feature-slug>
/forge-scripts <feature-slug> --scenario-type functional
/forge-scripts functional
```

> Automate the approved cases for `<feature-slug>` on branch
> `e2e/<feature-slug>`: feature files, steps, page/component objects, chart
> access through src/plotly, oracle assertions, tags and AIO traceability.

The scoped form automates only the intersection of requested `@functional`
cases, the Design-Gate-confirmed set, and cases not already automated. It never
promotes `@auto:next|later` or widens an empty selector.
The one-word form is accepted only when the active feature is unambiguous.

For calculated or business-rule-derived expectations, run
`/forge-oracle <feature-slug>` during Script Forge. It creates an independent oracle from
the approved rules and deterministic test data; the demo wafer oracle is not a
universal domain oracle.

For `@visual` scenarios, Script Forge reads the active profile's visual
guidance, preserves `@visual`, and uses the named baseline and approved masks
from case details. It adds `@automated` only after the profile's deterministic
baseline-update and comparison commands run and the required
expected/actual/diff evidence is available. Missing visual infrastructure is a
`TODO(env)` blocker, not permission to create a host baseline.

**You get:** branch `e2e/<feature-slug>` + `60-scripts/forge-notes.md`. Script Forge
**implements the step definitions + page objects behind the confirmed
`@auto:now` Gherkin** and adds `@automated` as each scenario becomes runnable.
It permanently retains `@manual`, never deletes or re-authors an approved
scenario, and leaves `@auto:next/later` manual-only until successive Script
Forge cycles automate them. The
skill refuses if Design Gate has neither recorded human approval nor an exact
allrounder bypass (that's policy P4 working, not a bug).
A scoped cycle may be done while feature-level scripting remains incomplete.

> **Example:** without a recorded Design Gate approval or allrounder bypass,
> `/forge-scripts` **refuses** and points at the empty ledger decision block.
> Once either human decision is recorded it produces
> branch `e2e/wafer-map-cluster-detection` and the five scenarios in
> `features/demo/cluster-detection.feature` — each asserting the chart
> against the numerical oracle.

## Stage 10 — Script Audit · runs itself

```
/audit-scripts <feature-slug>
/audit-scripts <feature-slug> --scenario-type functional
```

> Run the adversarial script audit for `<feature-slug>`: locator policy, no
> hard waits, render sync, verification depth, traceability, self-passing
> test detection.

**If FAIL:** fix on the branch (rerun Stage 9 with the findings), re-audit.
A scoped audit reports `SUBSET PASS/FAIL` with exact TC ids and never certifies
the rest of the feature.

**Allrounder bypass:** a named QA Lead or Automation Engineer may explicitly
say `bypass Script Audit` for the whole feature or one category. Route to
`/bypass-gate <feature> script-audit`. Claude keeps the real audit verdict and
findings (or records `not assembled`), binds the waiver to the exact TC
inventory and commit/file-hash manifest, and records the reason and residual
risk. The waiver lets Stability Run begin for that exact scope; it is not PASS,
becomes stale after any script change, and does not bypass Merge Gate.

> **Example:** the first Script Audit returned a **blocker** — a mock-mode DB
> step asserted rows the test itself had seeded, presented as engine
> evidence. Rework made it honest (annotated `EMULATED`, live-DB verification
> deferred to `TODO(env)`), fixed a hover-flake `high` plus ten more
> findings, then re-audited and re-ran the green screen.

## Stage 11 — Stability Run · Automation Engineer

```
/green-run <feature-slug>
/green-run <feature-slug> --scenario-type functional
```

> Run the full green-run loop for `<feature-slug>` until green ×3
> consecutive, recording every run. Diagnose failures — never rerun blindly,
> never green by deletion or retries.

A scoped Stability Run requires a matching scoped Script Audit PASS or current
manifest-bound waiver and records subset evidence only. Merge Gate still
requires the complete confirmed automation set.

**You get:** `80-green-run/green-run.md` with the run log. A failure resets
the streak and gets a root-cause note (flake-hunter helps).

> **Playwright BDD profile example:** configured `runTests` reports `6 passed`
> (auth setup + the five
> scenarios) in ~3s, three consecutive runs — the flake screen. If the chart
> ever disagreed with the oracle it would surface as
> `WRONG-DATA (severity: blocker)` and reset the streak, because wrong yield
> numbers are the worst failure this product can have.

## Stage 12 — Merge Gate · signed by an allrounder

```
/gate-merge <feature-slug>
/bypass-gate <feature-slug> script-audit
/bypass-gate <feature-slug> merge
```

**You get:** `docs/qa/<feature-slug>/audit/gate-merge.md` — includes the
**hard testId-coverage check**. An allrounder signs the ledger + report,
then the branch merges.

A named allrounder may explicitly waive Script Audit and/or say
`bypass Merge Gate`. These are separate decisions: the audit waiver satisfies
only the exact audit prerequisite, while the gate waiver permits progression
past the gate. Claude preserves the report's real readiness and allows PROBE to
continue only after the branch is actually merged. Neither bypass merges the
branch or bypasses repository permissions/branch protection.

> **Example:** the demo's Merge Gate report was assembled **NOT READY** with four
> named human-decision items — AIO ids still pending sync, Script Audit
> independence to confirm, two unratified proposed waivers, and an unsigned
> Exploratory Run risk acceptance. An honest NOT READY with named owners is the point;
> the orchestrator never stamps a gate green to move things along.

## Stage 13 — TestOps Promotion · Automation Engineer / QA Lead

```
/testops-promote <feature-slug>
```

> Wire `<feature-slug>` scenarios into CI: suite slicing (PR smoke vs
> nightly regression), one combined generated-scenario execution, Allure
> publishing, fail-on-flake behavior, durable `.probe/artifacts/**` archival,
> quarantine compliance, and time budgets.

> **Example:** with a Jenkins host still being stood up, TestOps Promotion wires the
> pipeline stages and records the runs as local-as-CI, explicitly marked
> `TODO(env)` — never presented as real pipeline history.

## Stage 14 — Ops Gate · signed by an allrounder

```
/gate-ops <feature-slug>
/bypass-gate <feature-slug> ops
```

**You get:** the Ops Gate evidence report — CI green ×5, flake rate < 2%, Allure
history clean, AIO statuses synced, and an exact manual-only inventory of zero.
Count effective tags, including Feature/Rule inheritance: `@manual` without
`@automated` is manual-only. Signature makes the feature's automation **Done**.

A named allrounder may explicitly say `bypass Ops Gate`. Claude keeps all
missing CI/flake/report evidence visible, records the waiver, and writes
`Done — Ops Gate bypassed` rather than ordinary `Done`.

Any exception must be a narrow human-signed waiver listing exact `TC-*` ids,
rationale, owner, expiry/backfill date, and retained manual coverage. A generic
percentage or open-ended waiver is not sufficient.

> **Example:** the demo's Ops Gate is **NOT READY pending first real CI history** —
> the Ops Gate will not call automation Done on local-as-CI evidence. It
> also has 19 manual-only scenarios and no lifecycle waiver. It becomes
> signable only after the Jenkins pipeline runs the suite green ×5 and the
> manual-only count reaches zero (or exact cases receive valid waivers).

To bypass every formal gate explicitly:

```text
/bypass-gate <feature-slug> all
```

Claude expands this into separate Design, Merge, and Ops decisions and waiver
rows. It never stores one vague wildcard waiver or calls the evidence passed.

---

## Cross-track: flaky test?

The moment a scenario fails intermittently (locally or in CI):

```
/flake-triage
```

> Scenario `<scenario name>` failed intermittently on `<where>` — run flake
> triage: classify the root cause, apply the quarantine policy, and open the
> exit-evidence trail.

Policy: `@quarantine` within 24h; quarantined tests keep running in a
non-gating stage; exit needs green ×5 evidence. Deleting or skipping a flaky
test to green a gate is evidence falsification (`blocker`).

> **Example:** a chart interaction that failed intermittently was traced to a
> real root cause — the click/hover helpers used raw viewport coordinates, so
> a chart scrolled below the fold received no events. The fix
> (`scrollIntoViewIfNeeded` before measuring, in `src/plotly/PlotlyChart.ts`)
> was a test-bug class, not an app bug; exit was gated on green ×5.

---

## Cross-track: frontend code changed?

**Frontend-embedded mode only** (framework living inside the app repo — the
demo app stands in here). Before pushing UI changes:

```
/change-impact
```

> Frontend code changed — run the change-impact analysis: contract check,
> feature-level impact, read the diff hunks, and propose the test-case and
> script updates.

Or the deterministic layer directly: configured `uiCheck` (fails on
removed/renamed testIds) and `uiImpact` (which scenarios/manual
cases a diff touches). Full guide with executable examples:
[ui-change-detection.md](../profiles/playwright-bdd/docs/ui-change-detection.md).

> **Playwright BDD profile example:** renaming
> `data-testid="wafer-csv-input"` in a consumer app makes configured `uiCheck`
> exit 1 with: _consumed by
> `src/pages/WaferAnalysisPage.ts` · breaks scenarios in
> `features/demo/cluster-detection.feature` · stale manual cases TC-…-001–005
> · re-run `--grep "@wafermap"` after fixing_. Proposed fixes come from
> `/change-impact`; nothing is auto-applied, and script changes still pass
> the Script Audit.

---

## The 10-minute mental model

1. **Design is gated before scripting** — a human who knows the domain signs
   what "correct" means before any automation exists.
2. **Every reviewer is adversarial and read-only** — auditors can't "fix"
   their way to agreement, so their findings mean something.
3. **Manual execution is evidence, not a stopgap** — record it and a feature
   can ship on it while automation catches up.
4. **Nothing is green by accident** — ×3 locally, ×5 in CI, no retries-as-
   evidence, no silent waivers, and wrong wafer numbers halt everything.
