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

## Stage 4 — Design Gate · a human decides

```
/gate-design <feature-slug>
```

> Assemble the Design Gate evidence digest for `<feature-slug>`.

**You get:** `docs/qa/<feature-slug>/audit/gate-design.md` — a digest of facts.
AC and scenario counts, the `@testtype:` breakdown, the routing reconciliation,
the design-coverage percentage with every uncovered AC named, the lint result,
open questions that control an expected value, and a **Gaps and open items**
section listing everything missing or failing. No `READY`/`NOT READY` stamp, no
✅/❌ checklist, and no recommendation.

**To approve:** read the digest — it is built for a five-minute read — confirm
the `@auto:now` automation set (edit the recommendation if you disagree; the
decision is yours under policy P8), and say so:

> I have reviewed all the cases and I approve them.

Claude then appends one row to the ledger's **Gate approvals** table: the gate,
the scope, your name, your role, a `YYYY-MM-DD HH:MM` timestamp, what you said
you reviewed, and a link to the digest. It writes
`Recorded by: Claude — transcribed from the human's direct approval`, fills the
same block in the report, and sets the Design Gate stage to `done`. Case Sync and
Script Forge unlock.

**Approving with gaps listed is a real decision** and is recorded as exactly
that — the gaps stay visible in the report. What Claude will not do is remove a
gap from the digest to make the decision look cleaner.

`continue`, `go ahead`, and `looks fine` are not approvals; Claude will ask which
you mean. Any role may approve. Claude never writes an approval nobody stated.

**Per category:** `/gate-design <feature-slug> --category CAT-03` assembles and
approves one category, so team members work categories in parallel. A category
approval authorises `/sync-cases --live --category CAT-03` and scripting for that
category only.

> **No scripting before a Design Gate approval.** `/forge-scripts` checks the
> ledger's Gate approvals table and refuses while there is no row naming a human
> with a timestamp for the scope. That is the only place PROBE blocks.

> **Example:** the digest reports 31 scenarios, design coverage 97%, lint clean,
> and two gaps — `AC-09` has no scenario, and `Q-04` (the sigma default) is still
> open. The QA Lead approves anyway, noting that `AC-09` is scheduled for the next
> cycle. The row records that; the two gaps stay in the report. A month later
> anyone can see exactly what was known when the decision was made.

## Stage 5 — Case Sync (AIO Tests) · Manual QA / Automation Engineer

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

## Stage 6 — Exploratory Run · Manual QA Engineer

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

## Stage 7 — UI Recon (optional but recommended) · any role

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

## Stage 8 — Script Forge · Automation Engineer

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
skill refuses if the ledger's Gate approvals table has no Design Gate row naming a
human with a timestamp for the scope (that's policy P4 working, not a bug).
A scoped cycle may be done while feature-level scripting remains incomplete.

> **Example:** without a recorded Design Gate approval, `/forge-scripts`
> **refuses** and points at the empty Gate approvals table.
> Once the human decision is recorded it produces
> branch `e2e/wafer-map-cluster-detection` and the five scenarios in
> `features/demo/cluster-detection.feature` — each asserting the chart
> against the numerical oracle.

## Stage 9 — Script Review · advisory, optional, any time

```
/audit-scripts <feature-slug>
/audit-scripts <feature-slug> --scenario-type functional
```

> Run an independent script review for `<feature-slug>`: locator policy, no hard
> waits, render sync, verification depth, traceability, self-passing test
> detection.

**This is advisory.** It holds no ledger row, gates nothing, and needs no waiver
— there is nothing to bypass. `/green-run` runs without it and the Merge Gate
assembles without it; if it was never run, the Merge Gate digest says so in one
line and the human decides whether that matters.

Run it when a fresh reading would help: after a Script Forge cycle, before the
Merge Gate, or when a suite passes and something about that feels wrong. Findings
are severity-ranked facts, not a verdict — fix them on the branch (rerun Stage 8),
or carry them into the Merge Gate digest for a human to weigh.

Independence is still the point: the context that wrote the automation is the worst
placed to notice a self-passing test. When no independent reviewer is available the
artifact says so and reports the findings as a labelled self-review.

> **Example:** the first review returned a **blocker** — a mock-mode DB step
> asserted rows the test itself had seeded, presented as engine evidence. Rework
> made it honest (annotated `EMULATED`, live-DB verification deferred to
> `TODO(env)`), fixed a hover-flake `high` plus ten more findings, then re-ran the
> green screen.

## Stage 10 — Stability Run · Automation Engineer

```
/green-run <feature-slug>
/green-run <feature-slug> --scenario-type functional
```

> Run the full green-run loop for `<feature-slug>` until green ×3
> consecutive, recording every run. Diagnose failures — never rerun blindly,
> never green by deletion or retries.

A scoped Stability Run records subset evidence only, and the Merge Gate digest
states that plainly so the human approving it knows what the subset was.

**You get:** `80-green-run/green-run.md` with the run log. A failure resets
the streak and gets a root-cause note (flake-hunter helps).

> **Playwright BDD profile example:** configured `runTests` reports `6 passed`
> (auth setup + the five
> scenarios) in ~3s, three consecutive runs — the flake screen. If the chart
> ever disagreed with the oracle it would surface as
> `WRONG-DATA (severity: blocker)` and reset the streak, because wrong yield
> numbers are the worst failure this product can have.

## Stage 11 — Merge Gate · a human decides

```
/gate-merge <feature-slug>
```

**You get:** `docs/qa/<feature-slug>/audit/gate-merge.md` — a digest of facts. The
stability-run table with every failure and its classification, the commit manifest
every piece of evidence refers to, lint/typecheck/generation results, lifecycle
integrity (`@manual` retained, generated set equals `@automated`), the coverage
rungs, the observability-gap state, any advisory review findings, and a **Gaps and
open items** section.

**To approve:** read the digest and say so. Claude appends the approval row with
your name, role, and a `YYYY-MM-DD HH:MM` timestamp, and sets the Merge Gate stage
to `done`.

**The approval is not the merge.** The branch still goes through the repository's
normal review, authorization, and branch protection — none of which PROBE performs
or waives. `/testops-promote` requires both the recorded approval *and* an actual
merge.

> **Example:** the digest lists four open items — AIO ids still pending sync, no
> advisory script review run this cycle, two manual-only cases without a
> disposition, and an unrecorded Exploratory Run decision. The Automation Engineer
> fixes the dispositions, records the exploratory decision, and approves with the
> other two still listed. The row says what they reviewed; the items stay visible.

## Stage 12 — TestOps Promotion · Automation Engineer / QA Lead

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

## Stage 13 — Ops Gate · a human decides

```
/gate-ops <feature-slug>
```

**You get:** the Ops Gate evidence digest — the last N CI runs with retries, the
flake rate against its threshold, report-history cleanliness, external sync state,
the four coverage rungs, and the manual-only inventory with each scenario's
disposition. Counts use effective tags, including Feature/Rule inheritance:
`@manual` without `@automated` is manual-only.

**To approve:** read the digest and say so. Claude appends the approval row with
your name, role, and timestamp, sets the Ops Gate stage to `done`, and records the
feature's automation outcome as **Done**.

Every expiry and backfill obligation attached to a manual-only disposition survives
the approval and is carried into the outcome line — Done never silently absorbs an
outstanding commitment. A scenario with no disposition at all is named in **Gaps**;
a percentage is not a disposition.

> **Example:** five green CI runs, flake rate 0.8%, one `@quarantine` scenario with
> a `/flake-triage` exit plan, and three manual-permanent cases with owners. The QA
> Lead approves; the ledger records automation Done with the three manual-permanent
> cases and their owners still listed.

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
2. **The reviewer is adversarial and read-only** — `/audit-scripts` can't "fix"
   its way to agreement, so its findings mean something. It is advisory: a human
   at the gate decides what each one is worth.
3. **Manual execution is evidence, not a stopgap** — record it and a feature
   can ship on it while automation catches up.
4. **Nothing is green by accident** — ×3 locally, ×5 in CI, no retries-as-
   evidence, and wrong wafer numbers are always a `blocker`.
5. **A gate is a record, not a verdict** — the digest states the facts including
   every gap, a named human decides, and the decision is stored with a timestamp.
   Nothing is computed, nothing is waived, and nothing is hidden to make a
   decision look cleaner.
