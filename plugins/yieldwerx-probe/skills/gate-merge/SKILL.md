---
name: gate-merge
user-invocable: true
description: Use when Script Forge and the Stability Run are done and the Merge Gate needs its evidence digest assembled, or when a human states they have reviewed the automation and approve the merge. Assembles facts — run results, lint and generation results, coverage rungs, observability gaps, and any advisory script-review findings — with no computed verdict, then records the human's decision with a timestamp. Never merges the branch. PROBE Merge Gate.
track: scripting
safety: writes-shared
produces: docs/qa/<feature>/audit/gate-merge.md (committed), docs/qa/<feature>/coverage.{md,json} (refreshed via the configured requirementsCoverage command)
consumes: features/<feature>/*.feature, 20-cases/automation-plan.md, 60-scripts/forge-notes.md, optional 70-script-audit/script-audit.md, 80-green-run/green-run.md, applicable observability gaps (40-ui-recon/testid-gaps.md only for UI), LEDGER.md
chains: /forge-scripts, /green-run, /testops-promote
argument-hint: <feature-slug>
---

> **Consumer contract:** Before using paths, commands, integrations, or
> framework-specific rules, read
> `${CLAUDE_PLUGIN_ROOT}/references/configuration.md`. Resolve consumer
> locations and commands from `probe.config.yaml`; use documented defaults
> only when the file is absent.

# Merge Gate

## Why

Give a human the automation's real track record — how it ran, what it asserts,
what is still missing — before it joins the shared test suite, and record what
they decided.

## What

An evidence digest of facts from Script Forge, the Stability Run, coverage,
observability contracts, and any advisory script review, followed by the human's
recorded approval.

## When

Run after the automation scope has been scripted and run, and again when a human
states they approve the merge.

## Where

Read consumer scripting and run artifacts plus ledger data; write the committed
Merge Gate report under the configured audit/report location.

## How

Cross-check the evidence against the current commit, refresh coverage, list every
gap plainly, present the digest, and stop. On an explicit human approval, write
the approval row with a timestamp.

**Authority:** `${CLAUDE_PLUGIN_ROOT}/references/governance/human-gates.md`. A
gate is a record of a human decision. This skill computes no verdict and blocks
on nothing.

**This gate never merges anything.** An approval records a QA decision; the
repository's own authorisation and branch protection are untouched and are not
PROBE's to satisfy.

## Procedure

1. Read the ledger and the scripting artifacts. Mark Merge Gate `in-progress`.
   Missing evidence becomes an entry in **Gaps and open items**, not a stop.

2. Gather the facts. Cross-check rather than trusting the artifacts' summaries:

   - the exact commit or file-hash manifest every piece of evidence refers to,
     and whether they all refer to the same one;
   - the stability-run table: how many runs, how many consecutive green, on which
     commit, with the isolation-probe result and every failure and its
     classification;
   - the configured `lintCases` result for the full case set, plus typecheck and
     test-generation results — counts verbatim;
   - lifecycle integrity from effective Gherkin tags, including tags inherited
     from `Feature` or `Rule`: designed / automated / manual-only counts, whether
     every `@automated` scenario also retains permanent `@manual`, whether the
     generated set equals the `@automated` set, and whether every automated
     performance TC maps to runnable k6 evidence;
   - each manual-only case's proposed disposition, and any that has none;
   - independent-truth layers on the wrong-data-risk cases: which are implemented
     and which are not;
   - traceability: scenario ↔ AC ↔ external case-management id. API, contract,
     and performance scenarios are recorded `AIO: n/a — repository-only`;
   - observability contracts. For UI scenarios, every gap in
     `40-ui-recon/testid-gaps.md` touching this feature and its current state
     (fixed, ticketed with a reference, or open). For non-UI scenarios, the
     applicable API/event/DB/audit/telemetry access gaps instead;
   - the Exploratory Run status and any unresolved bugs it raised;
   - **advisory script review**, when a `70-script-audit/script-audit.md` exists:
     its findings by severity, verbatim. If none was run, say so — it is
     advisory, and its absence is a line in the digest, not a blocker.

3. Refresh the requirements-coverage report with the configured
   `requirementsCoverage` command. Record all four rungs and name every AC in the
   confirmed `@auto:now` set that is not automated, or is automated and failing.

4. Write `docs/qa/<feature>/audit/gate-merge.md`:

   - **Evidence summary** — the facts from step 2, with artifact paths, dates, and
     the commit manifest.
   - **Coverage** — the four rung percentages and the attached matrix.
   - **Gaps and open items** — everything missing, failing, unrun, or
     unavailable. A broken green streak, a lint error, an `@automated` scenario
     without permanent `@manual`, an unticketed observability gap, a manual-only
     case with no disposition, a wrong-data-risk case with a single evidence
     layer, a subset presented where feature-level evidence was expected, and an
     unresolved exploratory bug all belong here. Never soften or omit one.
   - **Approval** — an empty block matching the ledger's Gate approvals columns.

   No readiness stamp, no ✅/❌ checklist.

5. Update the ledger: Merge Gate `in-progress`, link the report. Say what the
   human should look at, and what approving with the listed gaps would mean.
   Present and stop; do not recommend a decision.

6. When a human states their decision, append one row to the ledger's **Gate
   approvals** table — gate, scope, name, role, `YYYY-MM-DD HH:MM` local time,
   what they said they reviewed, and a link to this report — add
   `Recorded by: Claude — transcribed from the human's direct approval`, fill the
   same block in the report, and set the Merge Gate stage to `done`.

   `continue` and `go ahead` are not approvals. Ask which is meant.

## Hard rules

- **Claude never writes an approval the human did not state.** Without one there
  is no row, and `/testops-promote` stays locked.
- **An approval is not a merge.** The branch still goes through the repository's
  normal review and protection flow, which PROBE neither performs nor waives.
- All evidence must identify the same commit or file-hash manifest. A mismatch is
  a **Gaps** entry naming both.
- Coverage excludes `DER-NN` items and removed or superseded ACs.
