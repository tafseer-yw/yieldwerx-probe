# PROBE development track

Process authority for the `dev` track. The QA track's authority remains
[PROBE-PROCESS.md](PROBE-PROCESS.md); this document does not restate it, and
where the two ever appear to conflict, PROBE-PROCESS wins and the conflict is
reported rather than resolved locally.

> **The development track is gate-independent.** No development skill waits on,
> checks, assembles, signs, or is blocked by the Design, Merge, or Ops Gate, and
> none requires a QA artifact to exist. Every skill here runs on a repository
> that has never used PROBE's QA track at all. Where a QA artifact is present it
> is consumed as **optional enrichment** — better input, never a precondition.
> This is policy **D8**, and it is deliberate: PROBE's QA process is a
> QA-team-owned gating discipline, and coupling a developer's ability to build
> to a gate a different team signs would make the track unusable.

The development track exists for one reason: **the build and the tests were
governed by different processes, and the seam between them is where the
expensive findings live.** A control ships with no stable identifier and UI
Recon discovers it a quarter later. A service accepts an enum its own API
document does not declare and API Recon finds the contradiction after a hundred
cases were written against the document. A defect is filed, fixed somewhere
else, and no evidence ever returns. Every one of those is cheap at the moment
the code is written and expensive at every later moment.

## 1. The two tracks and where they may meet

Read the diagram as **what becomes possible when both tracks are running**, not
as a sequence either track waits on. Every arrow crossing the middle is
optional in both directions.

```text
 requirement
     │
     ├─► /probe-spec ──► spec-analysis (ACs, categories, open questions)
     │                        │                         │
     │                        │                         └─► QA track
     │                        ▼                              /forge-cases → … → /gate-ops
     │                   /build-feature ──► running build
     │                        │
     │                        ├─► /seed-testability ──► selector + document contracts
     │                        └─► /review-code ──► GO/NO-GO ──► /ship-change
     │                                 │
     └───────────────────────────────  ▼
                              the QA track observes it:
                              /probe-implementation · /ui-recon · /api-recon

 QA finds a defect:  /bug-report ──► candidate ──► /fix-defect ──► regression test + fix
 QA finds it flaky:  /flake-triage ──► classification ──► /fix-defect only when app-bug
 Dev changes behaviour: /revise-feature ──► invalidation list ──► /update-cases
```

Both tracks read the same requirement when both are running. Neither track edits
the other's artifacts. The handoffs are explicit artifacts, not conversations.

**The left column stands alone.** A developer with a requirement document, a
repository, and no QA track at all runs `/scaffold-app` → `/build-feature` →
`/review-code` → `/ship-change` and never encounters a gate, a ledger, a case
file, or a recon artifact. What the QA track adds is a better requirement
(`spec-analysis.md` instead of a PRD paragraph), a sharper defect (a candidate
with a failure packet instead of a symptom), and a verified gap list (recon
findings instead of only a code scan). All three are upgrades to the input, and
each skill states what it does when the upgrade is absent.

## 2. Skills

| Skill | Track role |
| --- | --- |
| `/scaffold-app` | Stand up an application whose QA contracts exist from the first commit. |
| `/forge-tech-design` | Spec analysis → the technical design for the declared stack, with decision records. |
| `/forge-unit-tests` | The developer-owned coverage the spec routed to unit/integration level. |
| `/forge-migration` | Schema and data changes as safe, registered, verified migrations. |
| `/sync-styleguide` | Implemented UI reconciled against the repository's own design authority. |
| `/build-feature` | Approved requirement → implemented, verified capability. |
| `/revise-feature` | Change existing behaviour compatibly, and name what it invalidates. |
| `/fix-defect` | A PROBE bug candidate → failing test → smallest correct fix. |
| `/seed-testability` | A recon gap list → shipped selector and document contracts. |
| `/review-code` | Independent adversarial review of application code. |
| `/ship-change` | Hygiene, commits, and a pull request carrying the evidence. |
| `/review-pr` | The opened pull request reviewed as its reviewer: claims versus diff, GO / NO-GO. |
| `/handoff` | Session-to-session continuity: the picture the next session needs, facts from git, one next step. |

## 3. Agents

| Agent | Used by |
| --- | --- |
| `requirement-clarifier` | `/build-feature`, `/revise-feature` — refuses to assume; every open question carries a recommended answer. |
| `tech-designer` | `/forge-tech-design` — maps the analysis onto the profile's real layers; refuses to invent stack facts. |
| `build-verifier` | `/build-feature`, `/revise-feature`, `/fix-defect`, `/review-code` — exact failures. |
| `code-reviewer` | `/review-code`, `/ship-change` — adversarial application-code review. |
| `testability-scout` | `/seed-testability`, `/build-feature`, `/revise-feature` — observability gaps. |

`script-auditor` reviews **test** code; `code-reviewer` reviews **application**
code. A change that is predominantly automation routes to `/audit-scripts`.

## 4. Standing policies

### D1 — The requirement owns behaviour; code never becomes the requirement

The requirement source — an approved `10-spec/spec-analysis.md`, or a named
requirement document — is truth. A mismatch found while building goes back to
the requirement source or into the build report's open questions. It never
resolves silently in favour of whichever reading was easier to implement.

This is the same separation `/probe-implementation` enforces from the QA side
(policy P12): intended behaviour and observed behaviour stay distinct. The dev
track is the other half of that rule — observed behaviour does not get to
rewrite intent just because dev is the one writing it.

A capability built with no requirement at all is permitted only with a recorded
`--no-requirement "<reason>"` in the build report.

### D2 — Testability is a build obligation, not a QA request

Every change ships the observability the QA track needs to verify it:

- every interactive or assertable element carries a stable identifier under the
  active profile's selector policy;
- every added or changed route appears in the served API document, with matching
  status codes, required fields, and enum values;
- every calculated business value a test must assert is readable without
  scraping a rendering.

These are unmet obligations, not backlog. `build-verifier` reports a change with
an unmet obligation as `red` even when every command passed, and `/review-code`
ranks each one at least `high`. `/seed-testability` exists for code written
before this policy, not as the place where new code's obligations are deferred
to.

An identifier that encodes a value or a state is not a contract. A trigger named
for its current selection and a cell named for its own on/off state both resolve
today and break silently tomorrow; both are gaps.

### D3 — A defect fix starts with a failing test

`/fix-defect` writes the regression test first, runs it, and records that it
failed — verbatim. A test written after the fix cannot fail and therefore proves
nothing. The only exception is a recorded `--no-test "<reason>"`, which appears
in the fix report where a reviewer will see it.

A fix is not complete until the mechanism is stated with `file:line`. "The
calculation was wrong" is not a mechanism.

### D4 — Verification is exact

Failures return verbatim: the command, the exit status, and the informative
output. Paraphrasing a failure into "a type error" destroys the only thing the
fix loop can act on. A check that could not run is `blocked` with the reason,
never silently skipped, and a missing toolchain is `environment`, not the change
failing.

Every command comes from `probe.config.yaml` or the active profile. A capability
with no configured command is reported unavailable; it is never guessed at.

### D5 — Review is independent and never self-signed

`/review-code` is structurally independent of the implementing pass, produces a
`GO`/`NO-GO` verdict, and never edits what it reviews. A review performed in the
same uninterrupted step as the implementation is recorded as such rather than
presented as independent.

**A code review is not a PROBE gate.** Its verdict is evidence a human weighs.
The Design, Merge, and Ops Gates remain human-signed decisions in the QA track,
and nothing in the dev track substitutes for one or fills a signature.

### D6 — Neither track edits the other's artifacts

Dev skills never touch a `.feature` file, a case-details artifact, a locator
inventory, a recon artifact, a ledger, or a gate report. QA skills never edit
application code.

When a dev change makes a QA artifact wrong, the dev skill produces a
**downstream-invalidation list** — exact feature files, TC ids, locator entries,
recon artifacts, and fixtures, each with its routing (`/update-cases`,
`/change-impact`, `/ui-recon`, `/api-recon`). Naming them is the deliverable;
amending them would destroy the TC and AIO identity `/update-cases` exists to
preserve.

Symmetrically, a test that fails because behaviour deliberately changed is an
entry on that list — never a test to delete, and never a reason to weaken an
assertion.

### D7 — Outward actions need explicit authorization

Committing locally is the default. Pushing, opening a pull request, commenting,
and installing a new third-party dependency each require explicit human
authorization in the invoking request. Merging is never done by a dev skill at
all: merge authorization belongs to the repository's own protection rules and,
for automation branches, to the Merge Gate.

Repository hooks are never bypassed. A failing hook is a finding.

### D8 — The development track never waits on a gate

No development skill checks a ledger for a gate decision, refuses because a gate
is unsigned, assembles gate evidence, or fills a signature. `/forge-scripts`
refuses without a recorded Design Gate approval because automating an
unapproved case wastes the automation; **building the application has no
equivalent dependency, and inventing one would block development on a signature
a different team owns.**

Concretely, and in each skill's own preconditions:

| Skill | What it needs | What it explicitly does not need |
| --- | --- | --- |
| `/scaffold-app` | a stack choice | any QA artifact at all |
| `/build-feature` | a requirement source, or a recorded `--no-requirement` | a spec analysis, a signed Design Gate, approved cases |
| `/revise-feature` | a concrete statement of the change | a spec analysis, approved cases, a recon artifact |
| `/fix-defect` | a reproducible defect | a filed bug candidate, a failing scenario, a QA classification |
| `/seed-testability` | a selector policy in the active profile | a recon pass, a gap list, a feature under QA |
| `/review-code` | a non-empty change set | a gate, a ledger, a QA verdict |
| `/ship-change` | a change to ship | a `GO` from `/review-code`, a Merge Gate |

Where a QA artifact **is** present, the skill consumes it as better input and
says so in its report. Its absence is never an error and never a refusal — the
skill states what it fell back to, so a reader can tell a build done with a spec
analysis from one done with a paragraph.

The dependency runs one way only: **the QA track may observe what the dev track
built; the dev track never waits for the QA track to decide anything.**

### D9 — One skill set, many stacks: routing is a profile, never a fork

Dev-track skills are stack-agnostic and resolve every stack fact — layers,
conventions, commands, traps — from the active stack profile
(`references/profiles/README.md` carries the contract and the resolution
order for `--stack`). Adding a stack is a profile, never a new skill, and a
skill that cannot resolve a stack stops and asks rather than guessing: a design
mapped onto the wrong layer model is confidently wrong in every detail.

A skill records which stack it resolved and how, and says explicitly when the
profile is marked **provisional** — a provisional profile carries approved
direction, not verified facts, and nothing built against it may cite it as
evidence of how existing code works.

### D10 — Spec Probe is shared, and the analysis is jointly owned

`/probe-spec` belongs to both tracks (`track: cross`). One `spec-analysis.md`
exists per feature; dev and QA read the same one, whoever runs it second reads
the existing artifact (the unqualified rerun fails closed), and a requirement
change goes through `--reconcile` so the downstream impact lands on both tracks
at once. The dev track's `/forge-tech-design` consumes the analysis exactly as
Case Forge does — never the raw PRD (token policy P7), and never a private
re-reading of it.

### D11 — Local, secret-free, and reversible

Work happens on `feat/<slug>` or `fix/<slug>`, never on a deployment branch, and
never against a shared environment. Unrelated working-tree changes are preserved
— never reverted, stashed away, or overwritten. Secrets, tokens, connection
strings, and machine-specific absolute paths never enter code, configuration, a
commit message, a pull-request body, or an artifact.


### D12 — Every dev skill ends in exactly one of four states

`COMPLETE` · `COMPLETE_WITH_NOTES` · `BLOCKED` · `NEEDS_INFO`. The vocabulary
is closed on purpose: "mostly done", "almost there", and "should be working
now" all hide which of the four is actually true, and the reader has to ask.

| State | Means | Required with it |
| --- | --- | --- |
| `COMPLETE` | Done, and verified by something that was actually run | the command and its real result |
| `COMPLETE_WITH_NOTES` | Done, with something the user should know | the notes, each actionable or explicitly FYI |
| `BLOCKED` | Cannot proceed without something outside the session's control | what blocks, who or what unblocks it, and what was done up to that point |
| `NEEDS_INFO` | Cannot proceed without a decision only the user can make | the question, **and the answer you recommend** |

`NEEDS_INFO` always carries a recommended default — a question posed without a
stance offloads the design onto the user and makes them reconstruct context the
skill already has. If the decision is genuinely theirs alone (a product call, a
spend, a risk they own), say that too; knowing it is not a technical question is
itself the useful part.

Never report `COMPLETE` for work whose verification was not run. `BLOCKED` on
an unrun verification is an honest outcome; a `COMPLETE` that turns out red
costs the next session more than the honesty would have.

## 5. Severity

The dev track uses the QA track's ladder unchanged
([PROBE-PROCESS.md §5](PROBE-PROCESS.md)): `blocker`, `high`, `medium`, `low`,
`info`. Two mappings are worth stating explicitly:

- **A change that would produce or display a wrong business value takes the
  configured `wrongBusinessDataSeverity`** — on a yield platform that is
  `blocker`, and it does not get re-graded for convenience.
- **An unmet observability obligation is at least `high`**, because it does not
  fail anything today and silently removes a verification layer tomorrow.

## 6. Artifacts

| What | Where |
| --- | --- |
| Clarified requirement | `.probe/artifacts/<feature>/70-build/clarified-requirement.md` |
| Build / revision / fix report | `.probe/artifacts/<feature>/70-build/{build,revision,fix}-report.md` |
| Verification log | `.probe/artifacts/<feature>/70-build/verification-log.md` |
| Testability gaps and report | `.probe/artifacts/<feature>/70-build/testability-{gaps,report}.md` |
| Code review | `.probe/artifacts/<feature>/70-build/code-review.md` |
| Ship notes | `.probe/artifacts/<feature>/70-build/ship-notes.md` |
| Scaffold report | `.probe/artifacts/<app-slug>/70-build/scaffold-report.md` |

`70-build` sits beside the QA track's numbered stage directories under the same
configured artifact root, so one feature's whole history — requirement, cases,
build, recon, scripts, evidence — reads in one place.

The permanent QA trail (`docs/qa/<feature>/`) stays QA-owned. No dev skill
writes to it.

## 7. Composition edges

Every dev skill and agent declares its edges in a `graph:` frontmatter block:
`consumes`, `produces`, `next`, `delegates`, and `used_by`. Node identifiers are
prefixed by kind — `skill:`, `agent:`, `artifact:`, `doc:`, `code:`,
`contract:`, `profile:`, `input:`. Repository validation rejects an unknown
prefix and a reference to a skill or agent that does not exist, so a rename
cannot leave a dangling edge behind.

The QA track's composition is documented in PROBE-PROCESS and PROBE-QUICKREF
rather than declared in frontmatter; backfilling it is a deliberate follow-up,
not an oversight.
