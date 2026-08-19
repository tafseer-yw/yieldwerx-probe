---
name: review-code
user-invocable: true
description: Use when application code is ready for independent adversarial review before merge — correctness, data integrity, security, error handling, requirement fidelity, and the observability obligations the QA track depends on. The application-code counterpart of audit-scripts, which reviews test code. PROBE development track.
track: dev
safety: read-only
produces: .probe/artifacts/<feature>/70-build/code-review.md with a GO or NO-GO verdict and ranked findings
consumes: the change under review (branch, staged set, or named files). A build report and a spec analysis are optional enrichment, never required.
argument-hint: <feature-slug> [branch|--staged|--files <path,...>] [--focus correctness|security|data|observability|all] [--depth quick|thorough]
graph:
  consumes:
    [code:changed-files, artifact:70-build/build-report.md?, artifact:10-spec/spec-analysis.md?]
  produces: [artifact:70-build/code-review.md]
  delegates: [agent:code-reviewer, agent:build-verifier]
  next: [skill:fix-defect, skill:ship-change, skill:green-run]
---

> **Consumer contract:** Before using paths, commands, integrations, or
> framework-specific rules, read
> `${CLAUDE_PLUGIN_ROOT}/references/configuration.md` and
> `${CLAUDE_PLUGIN_ROOT}/references/process/DEV-TRACK.md`. Resolve consumer
> locations and commands from `probe.config.yaml`; use documented defaults only
> when the file is absent.

# Review Code

## Why

PROBE already reviews automation adversarially and independently through
`/audit-scripts`, and applies that scrutiny to nothing else. The application
code that the automation tests — where a wrong calculation actually costs a
customer a wrong yield number — gets whatever review the author gave it. This
skill closes that asymmetry with the same posture: a structurally independent
reviewer instructed to attack the work, ranked on the same severity ladder,
producing a verdict rather than a list of opinions.

## What

An independent review of one change set, with a `GO` or `NO-GO` verdict, ranked
findings each carrying a concrete failure case and a `file:line`, and the unmet
obligations that must be met before merge.

## When

Run it before `/ship-change`, on any branch produced by `/build-feature`,
`/revise-feature`, `/fix-defect`, or `/seed-testability` — and on any other
application change worth a second pair of eyes. For test and automation code use
`/audit-scripts` instead; this skill routes there rather than reviewing a
scenario. **It consults no gate and no ledger**, and works on a repository where
the QA track has never run.

## Where

Reads the consumer repository; writes only the review artifact under the
configured `70-build` directory. It changes no code, ever.

## How

Freeze the change set, review it through every lens it touches, verify each
finding is real before reporting it, and return one verdict with the reason that
decided it.

`--depth` defaults to `thorough`. `quick` reviews the frozen diff plus the
immediate callers, consumers, and tests needed to make each finding concrete;
it runs focused checks only when they settle a finding. `thorough` also traces
all affected callers and dependents, migrations and stored-data compatibility,
the owning test suites, and every applicable profile obligation, then delegates
the full configured verification set to `build-verifier`. Both depths apply all
requested `--focus` lenses and use the same severity ladder; `quick` narrows
reach, never evidence quality.

## Preconditions — refuse if any fails

1. A change set resolves to at least one file. An empty set fails closed.
2. The reviewer is independent of the implementing pass. Do not review an
   implementation produced in the same uninterrupted step without saying so in
   the report — self-review is recorded, not pretended away.
3. If the change set is predominantly test or automation code, refuse and route:
   > "This change is automation. Use `/audit-scripts`, which owns the test-code
   > contracts; this skill reviews application code."

## Procedure

1. **Resolve depth and freeze the change set.** Apply the `quick` or `thorough`
   contract above, then resolve the branch, `--staged`, or `--files` argument
   into an exact file list and record it. A review whose scope moved while it
   ran proves nothing.
2. **Read the intent before the diff.** The build or revision report, the AC ids
   in scope, and the spec analysis where one exists — or, where none does, the
   commit messages and the stated request. A reviewer who does not know what the
   change was supposed to do can only check style; a reviewer who refuses to
   start because no spec analysis exists is not reviewing at all.
3. **Delegate the review.** Launch the **code-reviewer** agent with the frozen
   file list, the intent, the `--focus` scope, and the resolved `--depth`. It
   applies every lens the change touches: requirement fidelity, correctness,
   data integrity, error handling, security, observability obligations,
   determinism, and simplification.
4. **Verify findings before reporting them.** For each finding, confirm the
   concrete failing input or sequence — by reading the surrounding code, and by
   running the configured build and focused tests through the **build-verifier**
   agent where a run settles it. **A finding that cannot be made concrete is
   demoted to an observation.** Ranked lists of plausible concerns are how a
   review loses its authority.
5. **Rank on the configured severity ladder.** `blocker` halts the merge;
   `high` must be answered before it; `medium` is the signer's judgement; `low`
   and `info` are recorded. Apply the configured `wrongBusinessDataSeverity` to
   any finding where the application would produce or display a wrong business
   value — on this stack that is the class that matters most.
6. **Check the obligations, not just the code.** A change is not reviewable as
   complete while an added control has no stable identifier, an added route is
   missing from the served API document, a changed behaviour has no test, or a
   defect fix has no regression test. These are unmet obligations, reported
   separately from findings, and each one is at least `high`.
7. **Decide.** One verdict — `GO` or `NO-GO` — and the single reason that decided
   it. A `NO-GO` names exactly what must change. A `GO` with `medium` findings
   says which ones the author chose to carry.
8. **Report.** Write `70-build/code-review.md`: the frozen file list, the intent
   and AC ids, findings ranked with severity, `file:line`, concrete failure case
   and smallest correct fix, the unmet obligations, what was confirmed by running
   and what could not be reached, and the verdict with its reason.

## Boundaries

- **Never edit code.** Running the configured build, typecheck, lint, and test
  commands to confirm a suspicion is expected; changing a file is not. A review
  that fixes what it finds cannot report honestly on what it found.
- **Never sign a gate.** This is an engineering review, not a PROBE gate. Its
  verdict is evidence a human weighs; the Merge Gate remains the QA track's
  human-signed decision, and nothing here substitutes for it.
- **Never manufacture findings.** Say plainly when a change is sound. A review
  that always finds something teaches people to skip it.
- **Never lower a severity to reach `GO`.** A `blocker` that is inconvenient is
  still a `blocker`; the route is a recorded human waiver, not a re-grade.
- Report every surface you could not reach, so a reader knows the review's
  coverage rather than assuming it was complete.

## Closing state

End in exactly one of the four D12 states — `COMPLETE` /
`COMPLETE_WITH_NOTES` / `BLOCKED` / `NEEDS_INFO` — with the real verification
output attached to `COMPLETE` and a recommended answer attached to
`NEEDS_INFO`. Never report `COMPLETE` for work whose verification was not run.
