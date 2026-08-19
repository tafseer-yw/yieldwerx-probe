---
name: fix-defect
user-invocable: true
description: Use when any defect must be corrected in application code — a reported symptom, a failing scenario, or a PROBE bug candidate. Reproduce it with a failing test first, make the smallest change that turns it green, verify nothing else moved, and report the evidence. Needs no QA artifact and no gate. PROBE development track.
track: dev
safety: writes-code
produces: fix on branch fix/<defect-slug>; a regression test that fails before and passes after; .probe/artifacts/<feature>/70-build/fix-report.md
consumes: a reported symptom or reproduction. A bug candidate, failure-evidence packet, or flake-triage classification is optional enrichment, never required.
argument-hint: <feature-slug> "<defect-slug-or-symptom>" [--candidate <path>] [--tc TC-id] [--no-test "<reason>"]
graph:
  consumes: [input:defect-report, artifact:bug-sync/candidates?, artifact:60-scripts/failure-evidence?, artifact:80-flake/triage.md?]
  produces: [artifact:70-build/fix-report.md, code:service, code:frontend, code:regression-test]
  delegates: [agent:build-verifier, agent:code-reviewer]
  next: [skill:review-code, skill:green-run, skill:ship-change]
---

> **Consumer contract:** Before using paths, commands, integrations, or
> framework-specific rules, read
> `${CLAUDE_PLUGIN_ROOT}/references/configuration.md` and
> `${CLAUDE_PLUGIN_ROOT}/references/process/DEV-TRACK.md`. Resolve consumer
> locations and commands from `probe.config.yaml`; use documented defaults only
> when the file is absent.

# Fix Defect

## Why

PROBE finds defects and files them, and then the trail stops — the fix happens
somewhere else, under no process, and the evidence that it is actually fixed
never comes back. This is the return path. It also enforces the one discipline
that separates a fix from a guess: **the failing test comes first**, so "fixed"
means a test that demonstrably failed now demonstrably passes, rather than a
symptom that stopped appearing.

## What

The smallest correct change that resolves one defect, a regression test that
fails before it and passes after it, evidence that nothing else moved, and a fix
report the QA track can close its candidate against.

## When

Use when a defect is understood well enough to reproduce — however it was found.
A developer noticing it, a user reporting it, a scenario failing, and a filed
bug candidate are all valid starting points; **none of them is a prerequisite
for the others.** An intermittent failure is better classified first, by
`/flake-triage` where the QA track is running and by deliberate repetition where
it is not, because a fix applied to a flake usually just moves it. A defect that
turns out to be correct behaviour under a superseded requirement is not fixed
here — it goes back to whoever owns the requirement.

## Where

Application code in the consumer repository, on branch `fix/<defect-slug>`. The
regression test lands wherever the repository's conventions put coverage at its
level. The fix report goes to the configured `70-build` artifact directory.

## How

Reproduce first, understand the mechanism before editing, make the smallest
change that turns the failing test green, prove nothing else regressed, and
report what the QA track needs to close the candidate.

## Preconditions — refuse if any fails

1. The defect is reproducible, or `--no-test "<reason>"` explains why no test
   can pin it. An unreproducible defect with no reason is refused:
   > "Reproduce this defect first, or pass `--no-test` with the reason it cannot
   > be pinned by a test."
2. The defect is not already classified as something other than an application
   fault. **If no classification exists, proceed** — classification is useful
   input, not a required upstream step. Where one does exist and says
   `test-bug`, `sync-gap`, `data`, `environment`, or `infra`, this skill is the
   wrong one; say so and name the right route.
3. Unrelated working-tree changes are preserved, never reverted.

## Procedure

1. **Read the evidence, not the summary.** Whatever exists: the candidate JSON,
   the failure packet, the exact failing step, the screenshot, the request and
   response, the stack trace — or, where none of that exists, the reporter's own
   account and the logs. A defect understood only through its one-line title is
   a defect about to be fixed in the wrong place.
2. **Reproduce.** Get the defect to happen on demand — a request, a unit case, a
   scenario run. Record the exact reproduction so the report can carry it. If it
   will not reproduce, stop and say so rather than changing code hopefully.
3. **Write the failing test first.** Add it at the cheapest level that genuinely
   pins the defect: a unit test where the logic is wrong, an API test where the
   contract is wrong, a scenario only when the defect is in the journey.
   **Run it and record that it fails, with the verbatim output.** A regression
   test written after the fix proves nothing — it cannot fail.
4. **Find the mechanism before editing.** State, with `file:line`, why the wrong
   behaviour happens. "The comparison uses the soft bin while the rule declares
   hard" is a mechanism; "the calculation was wrong" is not. When the mechanism
   turns out to be a requirement disagreement rather than a code fault, stop and
   route it to the QA track instead of encoding one reading in code.
5. **Make the smallest change that turns the test green.** Fix the mechanism,
   not the symptom, and resist the refactor the surrounding code invites. An
   unrelated improvement in a fix branch hides the fix and makes it unrevertable.
6. **Check the sibling paths.** The same mechanism is usually wrong in more than
   one place. Search for it, and either fix each instance in this change or list
   the instances you deliberately left, with the reason.
7. **Verify — the exact-failure loop.** Delegate to the **build-verifier** agent.
   Confirm three things: the regression test now passes, the whole suite that
   owns the touched modules still passes, and no unmet obligation was introduced.
   Failures return verbatim into step 5.
8. **Report.** Write `70-build/fix-report.md`: the defect and its candidate id;
   the reproduction; the mechanism with citations; the regression test and its
   before-and-after output; the files changed; the sibling instances fixed or
   left; the verification output; and any behaviour a user will now see
   differently. Name the TC ids and candidate the QA track can close, and say
   explicitly whether the fix changes anything an approved case asserts.

## Boundaries

- **The failing test comes before the fix, always.** The only exception is a
  recorded `--no-test "<reason>"`, and that reason goes in the report where a
  reviewer will see it.
- **Never close the bug candidate yourself.** Where a candidate exists, the QA
  track owns its lifecycle and its Jira writes; this skill produces the evidence
  and names what can be closed. Filing or closing from here would bypass the
  mandatory human evidence review. Where no candidate exists, there is nothing
  to close and nothing to wait for.
- **Never edit a `.feature` file or a case artifact to make a fix look correct.**
  If an approved case asserts the old wrong behaviour, that is a finding routed
  to `/update-cases`, and it belongs in the report.
- **A fix branch contains a fix.** No unrelated refactor, no formatting sweep,
  no dependency bump.
- Work on `fix/<defect-slug>`. Never commit to a deployment branch, and never
  reproduce against a shared environment when a local one will do.

## Closing state

End in exactly one of the four D12 states — `COMPLETE` /
`COMPLETE_WITH_NOTES` / `BLOCKED` / `NEEDS_INFO` — with the real verification
output attached to `COMPLETE` and a recommended answer attached to
`NEEDS_INFO`. Never report `COMPLETE` for work whose verification was not run.
