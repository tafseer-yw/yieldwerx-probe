---
name: build-feature
user-invocable: true
description: Use when a requirement must become a working, verified capability in the application under test — clarify without assuming, design against the declared stack's real layers, implement in bounded tasks, and loop on exact failures until green. Routes by --stack and --layer; a backend-led run emits the FE handoff report so frontend work starts without re-discovery. Ships its own observability contracts. Runs with or without PROBE's QA track; needs no gate. PROBE development track.
track: dev
safety: writes-code
produces: implemented capability on branch feat/<feature-slug>; .probe/artifacts/<feature>/70-build/build-report.md; .probe/artifacts/<feature>/70-build/fe-handoff.md for backend-led work
consumes: a requirement source — a spec analysis, a PRD, or the stated request; the active profile. QA artifacts are optional enrichment, never required.
argument-hint: <feature-slug> [--stack <profile-name>] [--layer backend|frontend|both] [--ac AC-NN] [--category CAT-NN] [--requirement <path>] [--no-requirement "<reason>"]
graph:
  consumes: [doc:requirement-source, profile:active, artifact:10-spec/spec-analysis.md?]
  produces: [artifact:70-build/build-report.md, code:service, code:frontend, doc:openapi]
  delegates: [agent:requirement-clarifier, agent:build-verifier, agent:testability-scout]
  next: [skill:seed-testability, skill:review-code, skill:probe-implementation, skill:ship-change]
---

> **Consumer contract:** Before using paths, commands, integrations, or
> framework-specific rules, read
> `${CLAUDE_PLUGIN_ROOT}/references/configuration.md` and
> `${CLAUDE_PLUGIN_ROOT}/references/process/DEV-TRACK.md`. Resolve consumer
> locations and commands from `probe.config.yaml`; use documented defaults only
> when the file is absent.

# Build Feature

## Why

PROBE governs how a feature is tested but has never governed how it is built,
so the two tracks drift: the build ships a control with no stable identifier and
UI Recon discovers it months later, or the service accepts an enum value its own
API document does not declare and API Recon finds the contradiction after the
cases are written. Building inside PROBE closes that loop — the requirement that
produced the acceptance criteria also produces the code, and the observability
the QA track depends on is a build obligation rather than a later request.

## What

A complete, verified implementation of one capability, on its own branch, with
a build report naming the acceptance criteria it satisfies, the files it
changed, the verification output, and the observability contracts it added.

## When

Use for new capability. To change behaviour that already exists use
`/revise-feature`; to correct a defect use `/fix-defect`.

Run it as soon as a requirement exists in any form. A `10-spec/spec-analysis.md`
is the best input because its acceptance criteria are already decomposed; a PRD
or a story is perfectly acceptable; nothing at all requires an explicit
`--no-requirement "<reason>"` recorded in the report.

**This skill checks no gate, no ledger, and no approval.** It never refuses
because the QA track has not run, and it works on a repository that has never
used PROBE's QA track at all.

## Where

Application code in the consumer repository, on branch `feat/<feature-slug>`.
The build report goes to the configured `70-build` artifact directory. Nothing
here writes to `docs/qa/` — the QA ledger is the QA track's record.

## How

Clarify the requirement without inventing any part of it, design onto the
repository's real layers, split into tasks with non-overlapping files,
implement whole journeys, then verify in an exact-failure loop until green.

## Preconditions — refuse if any fails

1. A requirement source is named, or `--no-requirement "<reason>"` is supplied.
   A bare request with neither is refused:
   > "Name the requirement source, or pass `--no-requirement` with the reason
   > this capability is being built without one."
2. The working tree's unrelated changes are preserved. Never revert, stash away,
   or overwrite a change this skill did not make.
3. New third-party dependencies require explicit human approval before install.
   Propose them with the reason; do not add them and report afterwards.

**There is no fourth precondition.** No gate state, ledger entry, approval,
audit verdict, or QA artifact is checked. If a reader ever finds this skill
refusing on one, that is a defect in the skill, not the process.

## Procedure

0. **Resolve the stack and layer.** `--stack` per the resolution rules in
   `${CLAUDE_PLUGIN_ROOT}/references/configuration.md`; record which stack was
   resolved and how, and flag a provisional profile. `--layer` narrows the work
   to `backend`, `frontend`, or `both` (default `both`); a narrowed run still
   designs the whole journey so the seam is explicit, and implements only its
   side of it. When `60-design/tech-design.md` exists, it is the design of
   record — step 3 checks it against the repository instead of designing fresh,
   and a disagreement is recorded, dated, and resolved toward the requirement.
1. **Establish scope.** Read the requirement source. When a spec analysis
   exists, resolve the requested `--ac` / `--category` selector against it and
   record the exact AC ids in scope — **whatever its gate status**, because the
   acceptance criteria are useful as a decomposed requirement long before anyone
   signs anything. Selectors intersect and fail closed on zero matches. Without
   a spec analysis, state in one paragraph what this capability must do, and
   treat that paragraph as the scope of record. Say in the report which of the
   two you used.
2. **Clarify — refuse to assume.** Delegate to the **requirement-clarifier**
   agent with the request and the requirement source. It returns the requirement
   across its dimensions with provenance labels, the observability obligations,
   and the open questions. **Do not resolve an open question by choosing the
   plausible answer.** Put the questions to the user. Where a question needs the
   requirement itself to change, the routing depends on what exists: to
   `/probe-spec --reconcile` when a spec analysis owns that requirement, and
   otherwise straight to the person who owns the requirement document. Either
   way it is answered, not designed around.
3. **Design onto real layers.** Read the active profile and map the requirement
   onto the layers this repository actually has. Name every file you will create
   or change before creating any of them. Where a change crosses a boundary —
   a service route consumed by a screen, a stored column read by a report —
   sequence the producing side first.
4. **Split into bounded tasks.** At most five, with explicitly non-overlapping
   file sets. Where overlap is unavoidable, declare the merge order. Each task
   carries its scope, its files, its dependencies, and how it will be verified.
   Independent tasks may run in parallel; overlapping ones may not.
5. **Implement whole journeys, never fragments.** An endpoint means the route,
   its request and response types, its validation, its authorization, its
   persistence, **and its entry in the served OpenAPI document**. A screen means
   the component, its states — loading, empty, error, populated — its wiring,
   **and the stable identifier on every control the profile's selector policy
   covers.** A half-journey is not a smaller task; it is an unfinished one.
6. **Meet the observability obligations in this change.** Before the task is
   done, delegate to the **testability-scout** agent over the files you touched
   and clear every `high` gap it returns. A control with no stable identifier, a
   route absent from or contradicted by the API document, and a calculated
   result no test can read are all defects in this change — not backlog for
   `/seed-testability`, which exists for the code that predates this rule.
7. **Test what you built.** Add the unit and internal-integration coverage the
   repository's own conventions call for. This is developer-owned coverage; it
   does not replace the QA track's cases and it never edits a `.feature` file.
   Where the spec analysis routed an AC to a developer hand-off, that AC's
   coverage lands here.
8. **Verify — the exact-failure loop.** Delegate to the **build-verifier** agent
   with the changed files. It runs the configured build, typecheck, lint, and
   focused tests, plus the API-document and identifier parity checks, and
   returns failures verbatim. Failures go straight back into the implementing
   step unchanged. Loop until the verdict is green with no unmet obligations, or
   until blocked on a human decision — and say which.
8a. **Backend-led work emits the FE handoff.** When `--layer backend` (or the
   backend half of `both` lands first), write `70-build/fe-handoff.md`: every
   endpoint with its exact path and verbs, request and response shapes with
   real field names, enum/lookup names and their values, error responses and
   messages, and the identifiers of any new form sections or fields — so the
   frontend task starts from a contract, not from re-discovery in the network
   tab. The handoff cites the served API document as its proof; a handoff row
   the document contradicts is a defect in this change.
9. **Report.** Write `70-build/build-report.md`: the AC ids satisfied and any
   touched but not completed; the design decisions and what they rejected; the
   files changed, grouped by layer; the verification output; the test ids and
   API operations added; the open questions still unanswered; and what was
   deliberately deferred, with the reason. Close in exactly one of the four D12
   states (`COMPLETE` / `COMPLETE_WITH_NOTES` / `BLOCKED` / `NEEDS_INFO`), with
   the real verification output attached to `COMPLETE` and a recommended answer
   attached to `NEEDS_INFO`.

## Boundaries

- **The requirement is truth; code never becomes the requirement.** A mismatch
  discovered mid-build goes back to the requirement source or into the report's
  open questions. It never resolves silently in favour of what was easier to
  build. This is the same separation `/probe-implementation` enforces from the
  other side.
- **Never edit a `.feature` file, a case-details artifact, a ledger, or a gate
  report.** Those belong to the QA track. A build that needs a case to change
  raises it; it does not amend it.
- **Never read a gate for permission.** Gate state, ledger status, and audit
  verdicts are not inputs to this skill. Building is not gated on a QA
  signature, and a repository with no QA track is a supported case, not a
  degraded one.
- **Never weaken a test to make a build pass.** A failing test is either a real
  defect in the change or a test that encodes a superseded requirement — and the
  second is a finding for the QA track, not an edit to make here.
- Work on `feat/<feature-slug>`. Never commit to a deployment branch, and never
  run against a shared environment.
- Secrets, tokens, and machine-specific paths never enter code, configuration,
  or the report.
