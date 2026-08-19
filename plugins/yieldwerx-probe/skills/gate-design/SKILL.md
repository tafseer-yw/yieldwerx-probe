---
name: gate-design
user-invocable: true
description: Use when Spec Probe and Case Forge are done and the Design Gate needs its evidence digest assembled, or when a human replies that they have reviewed the cases and approve them. Assembles facts — AC and scenario counts, coverage numbers, lint results, and every gap — with no computed verdict, then records the human's decision with a timestamp and unlocks Case Sync and Script Forge. Claude never writes an approval the human did not state. PROBE Design Gate.
track: design
safety: writes-shared
produces: docs/qa/<feature>/audit/gate-design.md (committed), docs/qa/<feature>/coverage.{md,json} (via the configured requirementsCoverage command)
consumes: 10-spec/spec-analysis.md, optional 15-implementation-probe/implementation-comparison.md, features/<feature>/*.feature (permanent @manual Gherkin; no @automated before scripting), 20-cases/case-details.md, 20-cases/automation-plan.md, 20-cases/scope-manifest.md, 20-cases/coverage-notes.md, docs/qa/<feature>/LEDGER.md
chains: /probe-spec, /forge-cases, /sync-cases, /forge-scripts
argument-hint: <feature-slug> [--category CAT-NN] [approved]
---

> **Consumer contract:** Before using paths, commands, integrations, or
> framework-specific rules, read
> `${CLAUDE_PLUGIN_ROOT}/references/configuration.md`. Resolve consumer
> locations and commands from `probe.config.yaml`; use documented defaults
> only when the file is absent.

# Design Gate

## Why

Give a human everything they need to decide whether this test design is good
enough to build automation on, in a five-minute read, and record what they
decided.

## What

An evidence digest of facts — AC and scenario counts, coverage numbers, lint
results, known implementation differences, and every gap — followed by the
human's recorded approval.

## When

Run after Case Forge to assemble the digest, and again when a human states they
have reviewed the cases and approve them.

## Where

Read the configured design artifacts and the feature ledger; write the committed
Design Gate report under the consumer's configured ledger/report location.

## How

Recompute coverage, gather the facts, list every gap plainly, present the digest,
and stop. On an explicit human approval, write the approval row with a timestamp
and unlock Case Sync and Script Forge.

**Authority:** `${CLAUDE_PLUGIN_ROOT}/references/governance/human-gates.md`. A
gate is a record of a human decision. This skill computes no verdict, blocks on
nothing, and needs no waiver mechanism.

## Procedure

1. Read the ledger and the design artifacts. Mark Design Gate `in-progress`.
   Missing or partial inputs do not stop the digest — they become entries in
   **Gaps and open items**.

2. Gather the facts. Cross-check the artifacts rather than trusting their own
   summaries:

   - AC count by status, category count, scenario count per category;
   - `@testtype:` breakdown across the QA-owned levels, `@visual` count, and the
     `@auto:now / next / later` split;
   - designed / automated / manual-only counts from effective Gherkin tags,
     including tags inherited from `Feature` or `Rule`;
   - the routing reconciliation from `dev-handoff.md`:
     `<n> ACs in QA scenarios · <m> routed to developers · <k> uncovered`;
   - Case Forge's scope manifest: whether applicable design inventory remains;
   - the configured `lintCases` result for the full case set — the error and
     warning counts, verbatim;
   - open questions and unclear wording that control an expected result, with
     their owners;
   - when Implementation Probe ran: the compared build, and the
     aligned / divergent / not-implemented / not-observable counts with the
     known expected-failure list. When it did not run, say so.

3. Generate the requirements-coverage report with the configured
   `requirementsCoverage` command (writes `docs/qa/<feature>/coverage.{md,json}`).
   Record the design-coverage percentage and name every `⛔ GAP — no case` AC,
   every scenario missing an AC, and every unknown-AC reference. Attach the
   matrix.

4. Write `docs/qa/<feature>/audit/gate-design.md`:

   - **Evidence summary** — the facts from step 2, one short table per stage with
     artifact paths and dates.
   - **Coverage** — the design-coverage percentage and the attached matrix.
   - **Implementation comparison** — build provenance and result counts, or
     `not run`.
   - **Gaps and open items** — everything missing, failing, unrun, or
     unavailable, each with what it is and why it matters. An uncovered
     wrong-data-risk AC, a lint error, a partial scope manifest, an unanswered
     question that controls an expected result, and a category with no visual or
     API disposition all belong here. Never soften an entry and never omit one.
   - **Approval** — an empty block with the columns from the ledger's Gate
     approvals table.

   No readiness stamp, no computed verdict, no ✅/❌ checklist.

5. Update the ledger: Design Gate `in-progress`, link the report, and record the
   proposed `@auto:now` set. For `--category CAT-NN`, fill only that category's
   row in the per-category table and leave its approval fields empty.

6. Present the digest and stop. Say plainly what the gaps are and what approving
   with them visible would mean. Do not recommend a decision.

7. When a human states their decision, record it:

   - append one row to the ledger's **Gate approvals** table — gate, scope, their
     name, their role, `YYYY-MM-DD HH:MM` local time, what they said they
     reviewed in their terms, and a link to this report;
   - add `Recorded by: Claude — transcribed from the human's direct approval`;
   - record the confirmed `@auto:now` TC ids, or the exact automation-plan
     section they approved;
   - fill the same block in the gate report;
   - for a whole-feature approval, set the ledger's Design Gate stage to `done`
     and set its Updated date. For `--category CAT-NN`, fill only that
     category's row and keep the feature-level stage `in-progress` until every
     in-scope category is approved;
   - report that the approval is recorded, and point to `/sync-cases` (with the
     same category selector when scoped) and then `/forge-scripts`.

   `approved`, `I approve these cases`, and `reviewed and approved` are
   approvals. `continue`, `go ahead`, and `looks fine` are not — ask which is
   meant. Resolve the human's name and role from the ledger, an existing team
   record, or the current conversation; ask once for a missing name.

## Hard rule

**Claude never writes an approval the human did not state.** Not from a clean
digest, not from an approval of a different scope, not from an approval of an
earlier version of the same evidence. Without a human statement there is no
approval row, and `/sync-cases --live` and `/forge-scripts` stay locked.

Approving with gaps listed is a legitimate decision — record it exactly as
stated, with the gaps still visible in the report. Removing a gap from the digest
to make the decision look cleaner is falsified evidence and the most serious
failure this process guards against.
