---
name: forge-unit-tests
user-invocable: true
description: Use when the developer-owned test coverage must be written — the ACs the spec analysis routed to unit or internal-integration level in dev-handoff.md, implemented in the active stack's real test framework with independently derived expected values. Closes the loop on the routing artifact Case Forge produces: an AC routed to developers is a promise, and this skill is where it is kept. PROBE development track.
track: dev
safety: writes-code
produces: unit/integration tests in the stack's real framework; .probe/artifacts/<feature>/70-build/unit-test-notes.md
consumes: .probe/artifacts/<feature>/20-cases/dev-handoff.md when it exists, 10-spec/spec-analysis.md, 60-design/tech-design.md when it exists, the active stack profile
argument-hint: <feature-slug> [--stack <profile-name>] [--ac AC-NN]
graph:
  consumes: [artifact:20-cases/dev-handoff.md?, artifact:10-spec/spec-analysis.md, artifact:60-design/tech-design.md?, profile:active]
  produces: [code:tests, artifact:70-build/unit-test-notes.md]
  delegates: [agent:build-verifier]
  next: [skill:review-code, skill:ship-change]
  scope: [repo:*]
---

> **Consumer contract:** Before using paths, commands, integrations, or
> framework-specific rules, read
> `${CLAUDE_PLUGIN_ROOT}/references/configuration.md`. Resolve consumer
> locations and commands from `probe.config.yaml`; use documented defaults
> only when the file is absent.

# Unit Test Forge (dev track)

## Why

Case Forge routes calculation, decision, and internal-integration ACs to
developers in `dev-handoff.md` — and until now nothing consumed that file, so
"routed to developers" could quietly mean "routed to nobody." An AC in the
hand-off is a promise; this skill is where it is kept, and the QA track's
coverage report is where keeping it becomes visible.

## What

Developer-owned tests in the stack's real framework — the profile names it, and
the suite that exists wins over the suite the stack usually has — one test (or
table-driven set) per routed AC, with expected values derived independently of
the code under test, plus `unit-test-notes.md` mapping AC → test → result.

## When

Run after `/build-feature` (testing code that exists), or before it for
test-first work on a pure calculation. Rerun when `dev-handoff.md` gains rows
or a reconciliation changes a routed AC.

## Where

Test files where the stack's conventions put them; the AC→test map under the
feature's `70-build` artifact directory.

## How

Resolve the stack, read the routed AC set, write tests that would fail if the
behavior broke, run them through the configured command, and record the map.

## Procedure

1. **Resolve the stack**; read the profile's test conventions. If the profile
   says the framework is unconfirmed (`TODO(repo)`), confirm from the
   repository before writing a line, and write the answer back into the
   profile — never scaffold a second framework beside an existing one without
   recording the decision.
2. **Collect the target set.** `dev-handoff.md` rows (intersected with `--ac`
   when given); without a hand-off file, the analysis's **Best test level**
   column filtered to `unit`/`integration`. No inventory → say so and stop
   with `COMPLETE_WITH_NOTES` — inventing unit-test scope invents requirements.
3. **Write the tests.** Per routed AC: the direct case plus the boundary and
   failure rows the AC's risk dimensions name. Expected values are derived
   from the rule (worked examples, oracle tables from `case-details.md` when
   the QA track produced them) — **never read back from the code under test**;
   a test asserting the code against itself is the self-passing pattern and
   scores `blocker` everywhere else in PROBE.
4. **Run exactly what was written** via the configured `unitTests` /
   `unitTestsFiltered` command; then delegate to the **build-verifier** agent
   for the touched modules' wider suite. Failures return verbatim (D4) and
   loop.
5. **Write `unit-test-notes.md`**: AC → test file/name → command → result, plus
   routed ACs deliberately not covered and why. The QA track's
   `requirementsCoverage` reads coverage per AC; this note is the dev-side
   evidence for it.
6. **Close** in one D12 state, with the real command output attached to
   `COMPLETE`.

## Boundaries

- Never delete or weaken an existing test to make a new one pass; a conflict
  between tests is a finding about the requirement.
- Test code follows the repo's own conventions — `script-auditor` reviews test
  code adversarially and its severity anchors apply here too.
- An AC that turns out untestable at unit level goes back to the hand-off with
  a reason, so Case Forge can re-route it — it does not get silently dropped.
